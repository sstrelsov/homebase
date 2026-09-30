// Redraws the preview card's art from art.html, in a Chrome that's listening
// for DevTools (chrome --remote-debugging-port=9222):
//
//   cd stached-api && bun card/make-art.ts http://127.0.0.1:9222
//
// It opens a tab, screenshots art.html?base into base.png and art.html?glyphs
// into glyphs.png, saves the letters' metrics to glyphs.json, and closes the
// tab. Run it after changing art.html; card.ts reads all three.
import { decodePng, encodePng } from "../png";

const devtools = process.argv[2];
if (!devtools) throw new Error("Usage: bun card/make-art.ts <DevTools URL>");
const dir = new URL("./", import.meta.url);

const tab = await fetch(`${devtools}/json/new?about:blank`, {
  method: "PUT",
}).then((res) => res.json());
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve));

let lastId = 0;
const pending = new Map<number, (result: Record<string, unknown>) => void>();
socket.addEventListener("message", ({ data }) => {
  const { id, result, error } = JSON.parse(String(data));
  if (error) throw new Error(error.message);
  pending.get(id)?.(result);
});
const send = (method: string, params = {}): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    pending.set(++lastId, resolve);
    socket.send(JSON.stringify({ id: lastId, method, params }));
  });

interface Art {
  sheet: { width: number; height: number };
  [key: string]: unknown;
}

/** Loads art.html in a mode, waits for its fonts, and screenshots it. */
async function draw(mode: string, width: number, height: number) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: new URL(`art.html?${mode}`, dir).href });
  const { result } = (await send("Runtime.evaluate", {
    expression: `new Promise((done) => {
      const check = () => (window.art ? done(window.art) : setTimeout(check, 50));
      check();
    })`,
    awaitPromise: true,
    returnByValue: true,
  })) as { result: { value: Art } };
  // A frame for the last layout to paint.
  await Bun.sleep(300);
  const { data } = (await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })) as { data: string };
  return { art: result.value, png: Buffer.from(data, "base64") };
}

// Saved through our own encoder: RGB, and filtered the way card.ts writes.
const save = (name: string, png: Buffer) =>
  Bun.write(new URL(name, dir), encodePng(decodePng(png)));

const base = await draw("base", 1200, 630);
await save("base.png", base.png);
const { sheet } = base.art;
const glyphs = await draw("glyphs", sheet.width, sheet.height);
await save("glyphs.png", glyphs.png);
const { chars, advances, cell, day } = glyphs.art;
const metrics = new URL("glyphs.json", dir);
await Bun.write(metrics, JSON.stringify({ chars, advances, cell, day }));
// Laid out the way the repo's Biome lint expects.
Bun.spawnSync(["bunx", "biome", "format", "--write", metrics.pathname], {
  cwd: new URL("../../", dir).pathname,
});

await fetch(`${devtools}/json/close/${tab.id}`);
socket.close();
console.log("Drew base.png, glyphs.png and glyphs.json");
