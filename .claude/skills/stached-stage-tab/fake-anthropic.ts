// Preloaded into the throwaway "live" API only: answers Claude calls with a
// canned reply, so the admin page's Organize and Suggest can be driven with
// no key and no real call. Every other fetch goes through.
// Each Organize answer's first title carries its call's number ("Cookies 2"),
// so a test can tell which answer landed; each call is logged. It fixes the
// paste's typo "snickerdoodel", and invents "Walrus", which isn't in it.
const real = globalThis.fetch;
let calls = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.startsWith("https://api.anthropic.com/")) return real(input, init);
  const body = JSON.parse(String(init?.body));
  // A tile: Haiku's word, and the pasted word it says it came from.
  const tile = (word: string, from = word.toLowerCase()) => ({ word, from });
  const row = (title: string, words: (string | ReturnType<typeof tile>)[], stache = false) => ({
    title,
    words: words.map((w) => (typeof w === "string" ? tile(w) : w)),
    stache,
  });
  const n = ++calls;
  console.log(`fake-anthropic call ${n}: ${body.system.startsWith("You write the one line") ? "suggest" : "organize"}`);
  const answer = body.system.startsWith("You write the one line")
    ? { line: "Four groups walk into a bar" }
    : body.messages[0].content.includes("cookies")
      ? {
          kind: "rows",
          rows: [
            row(`Cookies ${n}`, ["Chocolate chip", "Oatmeal", "Sugar", tile("Snickerdoodle", "snickerdoodel")]),
            row("Martinis", ["Dirty", "Dry", "Vesper", "Espresso"]),
            row("Things with keys", ["Piano", "Map", "Keyboard", "Florida"]),
            row("Mustache styles", ["Pencil", "Imperial", "Toothbrush", "Walrus"], true),
          ],
          push: "Shaken, stirred, or dunked?",
          reason: "",
        }
      : { kind: "not_enough", rows: [], push: "", reason: "That reads like a shopping list, not groups" };
  await Bun.sleep(900);
  return Response.json({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify(answer) }] });
}) as typeof fetch;
