// Claude Haiku, for the admin page: it sorts a pasted idea into a puzzle's
// rows, and suggests a push line. The API stays dependency-free, so this
// calls the Messages API with fetch, with structured output. The key is
// ANTHROPIC_API_KEY in the API's settings; without it, both are off.
import { type Group, Stop } from "./puzzles";

const MODEL = "claude-haiku-5-5";

/** Sorting waits for this many words, so a paste like "test" costs nothing. */
export const ENOUGH_WORDS = 4;

/** What the lock screen shows of a push line: about three lines. */
const PUSH_ROOM = 110;

/** Haiku's rows, or why there's no puzzle in the paste yet. */
export type Organized =
  | { groups: Group[]; push: string | null }
  | { notEnough: string };

interface Ask {
  key: string;
  /** Stubbed in tests: no real calls there. */
  fetch?: typeof fetch;
}

const ORGANIZE = `You sort rough notes into a puzzle for Stached, a daily word game like Connections: four groups of four words, and one of the groups is about mustaches (the stache group).

The user pastes notes in any shape. Answer with kind "rows" and one row per group, in the order the notes give them:
- Words: only words and phrases from the notes, tidied (capitalize the first letter, fix spacing), never new ones. A group with fewer than four words gets "" for each missing word. At most four words per row.
- Title: the notes' own name for the group, tidied and with abbreviations spelled out, or a short name for what its words share.
- stache: true on the one group about mustaches, if one clearly is; otherwise false on every row.
- push: a line the notes mark for the notification (like "notif: ..."), as written; otherwise "".
- reason: "".

If the notes don't hold at least one group of words, answer with kind "not_enough", a short plain reason (one line, under 80 characters), no rows, and push "".`;

const SUGGEST = `You write the one line under "Puzzle #N is up" in the push notification for Stached, a daily word game like Connections with a mustache theme. Given today's groups, write a playful line, under 60 characters, that hints at the day without giving anything away: no group's title and none of its words. No hashtags, no emoji, no quotation marks.`;

const ROW = {
  type: "object",
  properties: {
    title: { type: "string" },
    words: { type: "array", items: { type: "string" } },
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

/** Whether a word or phrase is in the paste, whole, ignoring case. */
function inPaste(text: string, paste: string) {
  const escaped = loose(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "u",
  ).test(loose(paste));
}

const words = (text: string) => text.split(/\s+/).filter(Boolean);

/**
 * Sorts a paste into a puzzle's rows with Claude Haiku. A word that isn't in
 * the paste is never kept: its tile is left empty, as a missing word's is,
 * for the admin to fill.
 */
export async function organize(paste: string, how: Ask): Promise<Organized> {
  if (words(paste).length < ENOUGH_WORDS)
    return { notEnough: "Paste a few more words first" };
  const answer = (await ask(how, ORGANIZE, paste, ORGANIZED)) as {
    kind?: string;
    rows?: { title?: unknown; words?: unknown; stache?: unknown }[];
    push?: unknown;
    reason?: unknown;
  };
  const found = (text: unknown) =>
    typeof text === "string" && loose(text) && inPaste(text, paste)
      ? text.trim()
      : "";
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
      const kept = Array.isArray(row.words) ? row.words.map(found) : [];
      return {
        title: typeof row.title === "string" ? row.title.trim() : "",
        words: [0, 1, 2, 3].map((j) => kept[j] ?? ""),
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
