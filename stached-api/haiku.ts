// Claude Haiku, for the admin page: it sorts a pasted idea into a puzzle's
// rows, and suggests a push line. The API stays dependency-free, so this
// calls the Messages API with fetch, with structured output. The key is
// ANTHROPIC_API_KEY in the API's settings; without it, both are off.
import { enoughWords, type Group, PUSH_ROOM, Stop } from "./puzzles";

const MODEL = "claude-haiku-5-5";

/**
 * A row Haiku sorted, and per tile, the word as pasted where Haiku changed
 * it (a typo it fixed), for the page to offer back; "" where it didn't.
 */
interface SortedGroup extends Group {
  pasted: string[];
}

/** Haiku's rows, or why there's no puzzle in the paste yet. */
export type Organized =
  | { groups: SortedGroup[]; push: string | null }
  | { notEnough: string };

interface Ask {
  key: string;
  /** Stubbed in tests: no real calls there. */
  fetch?: typeof fetch;
}

const ORGANIZE = `You sort rough notes into a puzzle for Stached, a daily word game like Connections: four or five groups of four words, and one of the groups is about mustaches (the stache group).

The user pastes notes in any shape. Answer with kind "rows" and one row per group, in the order the notes give them:
- Words: one tile per word or phrase from the notes, never a new one. "from" is it exactly as the notes have it; "word" is it tidied: capitalize the first letter, fix spacing, and fix an obvious typo. A group with fewer than four words gets {"word": "", "from": ""} for each missing one. At most four tiles per row.
- Title: the notes' own name for the group, tidied and with abbreviations spelled out, or a short name for what its words share.
- stache: true on the one group about mustaches, if one clearly is; otherwise false on every row.
- push: a line the notes mark for the notification (like "notif: ..."), as written; otherwise "".
- reason: "".

If the notes don't hold at least one group of words, answer with kind "not_enough", a short plain reason (one line, under 80 characters), no rows, and push "".`;

const SUGGEST = `You write the one line under "Puzzle #N is up" in the push notification for Stached, a daily word game like Connections with a mustache theme. Given today's groups, write a playful line, under 60 characters, that hints at the day without giving anything away: no group's title and none of its words. No hashtags, no emoji, no quotation marks.`;

const TILE = {
  type: "object",
  properties: { word: { type: "string" }, from: { type: "string" } },
  required: ["word", "from"],
  additionalProperties: false,
};

const ROW = {
  type: "object",
  properties: {
    title: { type: "string" },
    words: { type: "array", items: TILE },
    stache: { type: "boolean" },
  },
  required: ["title", "words", "stache"],
  additionalProperties: false,
};

const ORGANIZED = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["rows", "not_enough"] },
    rows: { type: "array", items: ROW },
    push: { type: "string" },
    reason: { type: "string" },
  },
  required: ["kind", "rows", "push", "reason"],
  additionalProperties: false,
};

const SUGGESTED = {
  type: "object",
  properties: { line: { type: "string" } },
  required: ["line"],
  additionalProperties: false,
};

/**
 * One call to the Messages API, its answer held to `schema`. Haiku thinks
 * only a little (low effort), and the answer is read from its text block,
 * after any thinking.
 */
async function ask(
  { key, fetch = globalThis.fetch }: Ask,
  system: string,
  content: string,
  schema: object,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content }],
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new Stop("Couldn't reach Claude. Try again");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Claude said ${res.status}: ${data.error?.message ?? ""}`);
    throw new Stop(
      res.status === 401
        ? "Claude didn't take the Anthropic key"
        : res.status === 429 || res.status >= 500
          ? "Claude is busy. Try again in a minute"
          : "Claude couldn't do that",
    );
  }
  if (data.stop_reason === "refusal")
    throw new Stop("Claude wouldn't do that one");
  const text = data.content?.find(
    (block: { type: string }) => block.type === "text",
  )?.text;
  if (data.stop_reason === "max_tokens" || typeof text !== "string")
    throw new Stop("Claude's answer was cut off. Try again");
  try {
    return JSON.parse(text);
  } catch {
    throw new Stop("Claude's answer was cut off. Try again");
  }
}

/** Lowercase, with straight quotes and any run of spaces as one. */
const loose = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** Whether a word or phrase is in the paste (loose), whole, ignoring case. */
function inPaste(text: string, paste: string) {
  const escaped = loose(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "u",
  ).test(paste);
}

/** Lowercase letters and digits only: "Rock 'n' roll" is "rocknroll". */
const squash = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Edits from one string to the other: a character added, dropped, changed,
 * or swapped with its neighbor.
 */
function edits(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i ? (j ? 0 : i) : j)),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/**
 * Whether a word is the pasted one, or a typo fixed in it: the same letters
 * and digits, ignoring case, spacing and punctuation, give or take one edit
 * for a pasted word of up to five, or two for a longer one.
 */
export function closeTo(word: string, pasted: string) {
  const [a, b] = [squash(word), squash(pasted)];
  return Boolean(a && b) && edits(a, b) <= (b.length <= 5 ? 1 : 2);
}

/**
 * Sorts a paste into a puzzle's rows with Claude Haiku. A tile keeps Haiku's
 * word only if it's in the paste, or close to the pasted word Haiku says it
 * came from (closeTo); otherwise it's left empty, as a missing word's is, for
 * the admin to fill. Nothing is invented.
 */
export async function organize(paste: string, how: Ask): Promise<Organized> {
  // Sorting waits for enough words, so a paste like "test" costs nothing.
  if (!enoughWords(paste)) return { notEnough: "Paste a few more words first" };
  const answer = (await ask(how, ORGANIZE, paste, ORGANIZED)) as {
    kind?: string;
    rows?: { title?: unknown; words?: unknown; stache?: unknown }[];
    push?: unknown;
    reason?: unknown;
  };
  const pasted = loose(paste);
  const found = (text: unknown) =>
    typeof text === "string" && loose(text) && inPaste(text, pasted)
      ? text.trim()
      : "";
  // Haiku's word if it's in the paste; or if it's close to the pasted word
  // it came from, with that word for the page to offer back.
  const tile = (filled: unknown) => {
    const { word, from } = (filled ?? {}) as Record<string, unknown>;
    const kept = found(word);
    if (kept) return { word: kept, pasted: "" };
    const source = found(from);
    return typeof word === "string" && source && closeTo(word, source)
      ? { word: word.trim(), pasted: source }
      : { word: "", pasted: "" };
  };
  const rows = answer.kind === "rows" ? (answer.rows ?? []).slice(0, 8) : [];
  if (!rows.length)
    return {
      notEnough:
        typeof answer.reason === "string" && answer.reason.trim()
          ? answer.reason.trim()
          : "Couldn't find a group in that",
    };
  const stache = rows.findIndex((row) => row.stache === true);
  return {
    groups: rows.map((row, i) => {
      const tiles = [0, 1, 2, 3].map((j) =>
        tile(Array.isArray(row.words) ? row.words[j] : undefined),
      );
      return {
        title: typeof row.title === "string" ? row.title.trim() : "",
        words: tiles.map((t) => t.word),
        pasted: tiles.map((t) => t.pasted),
        ...(i === stache && { stache: true }),
      };
    }),
    push: found(answer.push) || null,
  };
}

/**
 * A push line from Claude Haiku, for a puzzle's groups as the admin page has
 * them so far.
 */
export async function suggestPush(groups: unknown, how: Ask) {
  const lines = (Array.isArray(groups) ? groups : []).map((g) => {
    const words = Array.isArray(g?.words) ? g.words : [];
    return `${String(g?.title ?? "")}${g?.stache === true ? " (the stache group)" : ""}: ${words.filter((w: unknown) => typeof w === "string" && w.trim()).join(", ")}`;
  });
  const { line } = (await ask(how, SUGGEST, lines.join("\n"), SUGGESTED)) as {
    line?: unknown;
  };
  const push = typeof line === "string" ? line.replace(/\s+/g, " ").trim() : "";
  if (!push) throw new Stop("Claude didn't come up with one. Try again");
  return push.slice(0, PUSH_ROOM);
}
