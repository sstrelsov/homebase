import { describe, expect, test } from "bun:test";
import { closeTo, organize, suggestPush } from "./haiku";

// Claude Haiku, stubbed: each test says what the Messages API answers, and
// sees what was asked. No real calls, and no real key.
/** What a request to the Messages API sent. */
interface Asked {
  url: string;
  headers: Headers;
  body: {
    model: string;
    output_config: {
      format: { type: string; schema: Record<string, unknown> };
    };
    messages: { role: string; content: string }[];
  };
}

function stub(answer: unknown, { status = 200, stop = "end_turn" } = {}) {
  const asked: Asked[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    asked.push({
      url,
      headers: new Headers(init.headers),
      body: JSON.parse(String(init.body)),
    });
    return Response.json(
      status === 200
        ? {
            stop_reason: stop,
            content: [
              { type: "thinking", thinking: "", signature: "…" },
              { type: "text", text: JSON.stringify(answer) },
            ],
          }
        : { type: "error", error: { type: "error", message: "No" } },
      { status },
    );
  }) as unknown as typeof globalThis.fetch;
  return { how: { key: "test-key", fetch }, asked };
}

// Made up, like puzzles.example.json, in the rough shape Spencer pastes,
// typos and all.
const PASTE = `breakfast: waffle, bagle, omelet / blue ones - navy, teal, azure, cobalt
stache: walrus, handlebar, horseshoe, chevron
notif: Rise and shine`;

type Tile = { word: string; from: string };

/**
 * A row as Haiku answers it. A word alone is a tile tidied from the same
 * word in lowercase, as pasted.
 */
const row = (title: string, tiles: (string | Tile)[], stache = false) => ({
  title,
  words: tiles.map((t) =>
    typeof t === "string" ? { word: t, from: t.toLowerCase() } : t,
  ),
  stache,
});

const NONE = ["", "", "", ""];

describe("organizing a paste", () => {
  test("asks Haiku for structured rows, with the key", async () => {
    const { how, asked } = stub({
      kind: "not_enough",
      rows: [],
      push: "",
      reason: "No groups",
    });
    await organize(PASTE, how);
    const [{ url, headers, body }] = asked;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(headers.get("x-api-key")).toBe("test-key");
    expect(headers.get("anthropic-version")).toBe("2023-06-01");
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.output_config.format.type).toBe("json_schema");
    // Each tile says which pasted word it came from.
    expect(JSON.stringify(body.output_config.format.schema)).toContain(
      '"required":["word","from"]',
    );
    expect(body.messages).toEqual([{ role: "user", content: PASTE }]);
  });

  test("keeps Haiku's rows, tidied, with the stache group marked", async () => {
    const { how } = stub({
      kind: "rows",
      rows: [
        row("Breakfast", ["Waffle", "Omelet", ""]),
        row("Shades of blue", ["Navy", "Teal", "Azure", "Cobalt"]),
        row(
          "Mustache styles",
          ["Walrus", "Handlebar", "Horseshoe", "Chevron"],
          true,
        ),
      ],
      push: "Rise and shine",
      reason: "",
    });
    expect(await organize(PASTE, how)).toEqual({
      groups: [
        {
          title: "Breakfast",
          words: ["Waffle", "Omelet", "", ""],
          pasted: NONE,
        },
        {
          title: "Shades of blue",
          words: ["Navy", "Teal", "Azure", "Cobalt"],
          pasted: NONE,
        },
        {
          title: "Mustache styles",
          words: ["Walrus", "Handlebar", "Horseshoe", "Chevron"],
          pasted: NONE,
          stache: true,
        },
      ],
      push: "Rise and shine",
    });
  });

  test("fixes a typo, and says what was pasted", async () => {
    const { how } = stub({
      kind: "rows",
      rows: [
        row("Breakfast", [
          "Waffle",
          { word: "Bagel", from: "bagle" },
          // Spacing is a change on the board, too.
          { word: "Ome let", from: "omelet" },
          // Teal is in the paste, whatever Haiku says it came from.
          { word: "Teal", from: "navy" },
        ]),
      ],
      push: "",
      reason: "",
    });
    expect(await organize(PASTE, how)).toEqual({
      groups: [
        {
          title: "Breakfast",
          words: ["Waffle", "Bagel", "Ome let", "Teal"],
          pasted: ["", "bagle", "omelet", ""],
        },
      ],
      push: null,
    });
  });

  test("never keeps a word that isn't in the paste, or close to it", async () => {
    const { how } = stub({
      kind: "rows",
      rows: [
        // Pancake is invented; Bacon is too far from the word it says it
        // came from; a fifth word has no tile.
        row("Breakfast", [
          "Waffle",
          { word: "Bacon", from: "bagle" },
          "Omelet",
          "Pancake",
          "Teal",
        ]),
        // Wal is part of a pasted word, not one; Handle is too far from it.
        row("Mustache styles", [
          "Wal",
          { word: "Handle", from: "handlebar" },
          "Horseshoe",
          "Chevron",
        ]),
      ],
      push: "Good morning",
      reason: "",
    });
    expect(await organize(PASTE, how)).toEqual({
      groups: [
        {
          title: "Breakfast",
          words: ["Waffle", "", "Omelet", ""],
          pasted: NONE,
        },
        {
          title: "Mustache styles",
          words: ["", "", "Horseshoe", "Chevron"],
          pasted: NONE,
        },
      ],
      push: null,
    });
  });

  test("one stache group at most, and short rows filled out", async () => {
    const { how } = stub({
      kind: "rows",
      rows: [
        row("Blue", ["Navy", "Teal"], true),
        row("Stache", ["Walrus"], true),
      ],
      push: "",
      reason: "",
    });
    const { groups } = (await organize(PASTE, how)) as {
      groups: { words: string[]; stache?: boolean }[];
    };
    expect(groups.map((g) => g.stache ?? false)).toEqual([true, false]);
    expect(groups[1].words).toEqual(["Walrus", "", "", ""]);
  });

  test("says why when there's no puzzle in it", async () => {
    const { how } = stub({
      kind: "not_enough",
      rows: [],
      push: "",
      reason: "That's a grocery list, not groups",
    });
    expect(await organize("milk eggs bread butter jam", how)).toEqual({
      notEnough: "That's a grocery list, not groups",
    });
  });

  test("waits for a few words before asking", async () => {
    const { how, asked } = stub({});
    expect(await organize("test", how)).toEqual({
      notEnough: "Paste a few more words first",
    });
    expect(asked).toHaveLength(0);
  });

  test("says plainly when Claude won't or can't answer", async () => {
    const rows = { kind: "rows", rows: [], push: "", reason: "" };
    const tries: [ReturnType<typeof stub>, string][] = [
      [stub(rows, { status: 401 }), "Claude didn't take the Anthropic key"],
      [stub(rows, { status: 529 }), "Claude is busy. Try again in a minute"],
      [stub(rows, { status: 400 }), "Claude couldn't do that"],
      [stub(rows, { stop: "refusal" }), "Claude wouldn't do that one"],
      [
        stub(rows, { stop: "max_tokens" }),
        "Claude's answer was cut off. Try again",
      ],
    ];
    for (const [{ how }, message] of tries)
      await expect(organize(PASTE, how)).rejects.toThrow(message);
    const offline = async () => {
      throw new TypeError("fetch failed");
    };
    await expect(
      organize(PASTE, {
        key: "test-key",
        fetch: offline as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Couldn't reach Claude. Try again");
  });
});

describe("a word close to the pasted one", () => {
  test("ignores case, spacing and punctuation", () => {
    expect(closeTo("Rock 'n' roll", "rock n roll")).toBe(true);
    expect(closeTo("Horse shoe", "horseshoe")).toBe(true);
    expect(closeTo("BigX", "big-x")).toBe(true);
  });

  test("allows one edit in a word of up to five letters", () => {
    expect(closeTo("Shaken", "shakn")).toBe(true);
    expect(closeTo("The", "teh")).toBe(true); // a swap is one edit
    expect(closeTo("Bagel", "bgl")).toBe(false);
    expect(closeTo("Dog", "cat")).toBe(false);
  });

  test("allows two in a longer one", () => {
    expect(closeTo("Snickerdoodle", "snickrdodle")).toBe(true);
    expect(closeTo("Snickerdoodle", "snickrdodl")).toBe(false);
    expect(closeTo("Oatmeal raisin", "oatmeal")).toBe(false);
  });

  test("needs letters or digits on both sides", () => {
    expect(closeTo("", "a")).toBe(false);
    expect(closeTo("?!", "?!")).toBe(false);
  });
});

describe("suggesting a push line", () => {
  // As the page has them.
  const groups = [
    { title: "Breakfast", words: ["Waffle", "Bagel", "Omelet", "Pancake"] },
    {
      title: "Mustache styles",
      words: ["Walrus", "Handlebar", "", "Chevron"],
      stache: true,
    },
  ];

  test("sends the groups so far and keeps one line", async () => {
    const { how, asked } = stub({ line: "  Rise,\nshine, and twirl  " });
    expect(await suggestPush(groups, how)).toBe("Rise, shine, and twirl");
    expect(asked[0].body.messages[0].content).toBe(
      "Breakfast: Waffle, Bagel, Omelet, Pancake\nMustache styles (the stache group): Walrus, Handlebar, Chevron",
    );
  });

  test("says so when there's no line", async () => {
    const { how } = stub({ line: " " });
    await expect(suggestPush(groups, how)).rejects.toThrow(
      "Claude didn't come up with one",
    );
  });
});
