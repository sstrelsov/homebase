import { describe, expect, test } from "bun:test";
import { organize, suggestPush } from "./haiku";

// Claude Haiku, stubbed: each test says what the Messages API answers, and
// sees what was asked. No real calls, and no real key.
/** What a request to the Messages API sent. */
interface Asked {
  url: string;
  headers: Headers;
  body: {
    model: string;
    output_config: { format: { type: string } };
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

// Made up, like puzzles.example.json, in the rough shape Spencer pastes.
const PASTE = `breakfast: waffle, bagel, omelet / blue ones - navy, teal, azure, cobalt
stache: walrus, handlebar, horseshoe, chevron
notif: Rise and shine`;

const row = (title: string, words: string[], stache = false) => ({
  title,
  words,
  stache,
});

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
    expect(body.messages).toEqual([{ role: "user", content: PASTE }]);
  });

  test("keeps Haiku's rows, tidied, with the stache group marked", async () => {
    const { how } = stub({
      kind: "rows",
      rows: [
        row("Breakfast", ["Waffle", "Bagel", "Omelet", ""]),
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
        { title: "Breakfast", words: ["Waffle", "Bagel", "Omelet", ""] },
        { title: "Shades of blue", words: ["Navy", "Teal", "Azure", "Cobalt"] },
        {
          title: "Mustache styles",
          words: ["Walrus", "Handlebar", "Horseshoe", "Chevron"],
          stache: true,
        },
      ],
      push: "Rise and shine",
    });
  });

  test("never keeps a word that isn't in the paste", async () => {
    const { how } = stub({
      kind: "rows",
      rows: [
        // Pancake is invented; Wal is part of a word, not one; a fifth word
        // has no tile.
        row("Breakfast", ["Waffle", "Bagel", "Omelet", "Pancake", "Teal"]),
        row("Mustache styles", ["Wal", "Handlebar", "Horseshoe", "Chevron"]),
      ],
      push: "Good morning",
      reason: "",
    });
    expect(await organize(PASTE, how)).toEqual({
      groups: [
        { title: "Breakfast", words: ["Waffle", "Bagel", "Omelet", ""] },
        {
          title: "Mustache styles",
          words: ["", "Handlebar", "Horseshoe", "Chevron"],
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

describe("suggesting a push line", () => {
  const groups = [
    row("Breakfast", ["Waffle", "Bagel", "Omelet", "Pancake"]),
    row("Mustache styles", ["Walrus", "Handlebar", "", "Chevron"], true),
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
