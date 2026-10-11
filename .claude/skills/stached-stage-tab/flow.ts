// The admin page's Stage tab, end to end: headless at 390px, on the throwaway
// stacks (up.sh), as the check script runs it. Stops with a screenshot at the
// first failure. Never a visible window.
//   bun flow.ts <shots dir> <state dir>
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium, type Page } from "playwright-core";

const [SHOTS, STATE] = process.argv.slice(2);
const SITE = "http://localhost:5215";
const L = "http://127.0.0.1:3915";
const T = "http://127.0.0.1:3916";
const LIVE_FILE = `${STATE}/live/puzzles.json`;
const STAGED_FILE = `${STATE}/live/staged.json`;

type Puzzle = { date: string; groups: { title: string; words: string[]; stache?: boolean }[]; push?: string };
const json = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const md5 = (file: string) => createHash("md5").update(readFileSync(file)).digest("hex");
const titles = (p: Puzzle) => p.groups.map((g) => g.title + (g.stache ? "*" : ""));
const post = (api: string, path: string, body: unknown, token?: string) =>
  fetch(`${api}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  }).then((r) => r.json());
const get = (api: string, path: string, token: string) =>
  fetch(`${api}${path}`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
const psql = (sql: string) =>
  Bun.spawnSync(["/opt/homebrew/opt/postgresql@17/bin/psql", "-h", "localhost", "-p", "5515", "-U", "postgres", "-d", "stached", "-Atc", sql])
    .stdout.toString().trim();

let page: Page;
let step = 0;
const shot = async (name: string) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${String(++step).padStart(2, "0")}-${name}.png`, fullPage: true });
};
const check = async (ok: unknown, what: string) => {
  if (ok) return console.log(`ok   ${what}`);
  console.log(`FAIL ${what}`);
  await shot("FAIL");
  // KEEP_GOING=1 logs every failure, for a run against old code.
  if (!process.env.KEEP_GOING) throw new Error(what);
};
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Board order on screen, the stache marked with *.
const boardTitles = () =>
  page.locator('[data-field^="t:"]').evaluateAll((inputs) =>
    inputs.map((i) => {
      const row = i.closest("section");
      const stache = row?.querySelector('button[aria-pressed="true"]');
      return (i as HTMLInputElement).value + (stache ? "*" : "");
    }),
  );
const status = () =>
  page.locator("text=/^(Staged|Not staged yet|Changes not staged|Published, no changes)$/").first().textContent().catch(() => null);
const blur = () => page.locator("body").click({ position: { x: 5, y: 5 } });

const admin = await post(L, "/login", { name: "admin", password: "admin" });
const bea = await post(L, "/login", { name: "Bea", password: "test" });
const today = (await get(L, "/today", bea.token)).puzzle;
await post(L, "/start", { date: today.date }, bea.token);
const liveToday = (json(LIVE_FILE) as Puzzle[]).find((p) => p.date === today.date) as Puzzle;
const liveBefore = md5(LIVE_FILE);

const browser = await chromium.launch({ headless: true });
try {
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((session) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("stached.session", session);
    localStorage.setItem("stached.adminTab", "stage");
    localStorage.removeItem("stached.stage");
  }, JSON.stringify(admin));

  await page.goto(`${SITE}/stached/admin`);
  await page.getByText("Coming up").waitFor();
  await shot("paste");
  const firstDay = await page.locator("ul li button").first().textContent();
  await check(firstDay?.startsWith("Today"), `Coming up starts at today, not the stale staged date (first: ${firstDay})`);

  // Organize, and Cancel mid-call: the late answer must not land.
  const paste = page.locator('[data-field="paste"]');
  await paste.fill(`cookies: chocolate chip, oatmeal, sugar, snickerdoodle / martinis: dirty, dry, vesper, espresso
things w keys - piano, map, keyboard, florida
stache ones: pencil, imperial, toothbrush, english
notif: Shaken, stirred, or dunked?`);
  const organize = page.getByRole("button", { name: "Organize" });
  const cancel = page.getByRole("button", { name: "Cancel" });
  const sorting = page.getByText("Claude Haiku is sorting it");
  const sorted = page.getByText("sorted your paste into rows");
  await organize.click();
  await sorting.waitFor();
  await shot("organizing");
  await cancel.click();
  await page.waitForTimeout(1800); // the fake answers after 900ms
  await check(await paste.isVisible(), "Cancel goes back to the paste");
  await check(!(await sorted.isVisible()), "the cancelled call's answer doesn't land");

  // Organize, Cancel, Organize again before the first answer is back: only
  // the last call's answer lands.
  await organize.click();
  await sorting.waitFor();
  await page.waitForTimeout(150);
  await cancel.click();
  await organize.click();
  await sorted.waitFor();
  await check((await boardTitles())[0] === "Cookies 3", `the last call's answer lands (${(await boardTitles())[0]})`);
  await page.waitForTimeout(1500);
  await check((await boardTitles())[0] === "Cookies 3", "and stays: no earlier answer replaces it");
  await shot("board");
  await check(eq(await boardTitles(), ["Cookies 3", "Martinis", "Things with keys", "Mustache styles*"]), `Haiku's rows: ${await boardTitles()}`);

  // Edit: fill the tile Haiku left empty (its word wasn't in the paste).
  const hole = page.locator('input[aria-label="Mustache styles, word 4"]');
  await check((await hole.inputValue()) === "", "an invented word comes back as an empty tile");
  await hole.fill("English");
  await blur();
  await check((await page.locator("#problems").count()) === 0, "no problems once it's filled");

  // Move a row, then make another group the stache.
  await page.getByRole("button", { name: "Move down: harder" }).first().click();
  await check(eq(await boardTitles(), ["Martinis", "Cookies 3", "Things with keys", "Mustache styles*"]), `moved down: ${await boardTitles()}`);
  const martinis = (await boardTitles()).indexOf("Martinis");
  await page.locator('section:has([data-field^="t:"])').nth(martinis)
    .getByRole("button", { name: "Make it the stache group" }).click();
  await check(eq(await boardTitles(), ["Mustache styles", "Cookies 3", "Things with keys", "Martinis*"]), `stache swapped, old one in its place: ${await boardTitles()}`);
  await shot("moved");

  // Stage: on the tester, and the live game untouched.
  await page.getByRole("button", { name: "Stage", exact: true }).click();
  const toast = page.getByText(/Staged, (and|not) on the tester/);
  await toast.waitFor();
  await shot("staged");
  await check((await toast.textContent()) === "Staged, and on the tester", `toast: ${await toast.textContent()}`);
  await check((await status()) === "Staged", `status after staging: ${await status()}`);
  const staged = (json(STAGED_FILE) as Puzzle[]).filter((p) => p.date > today.date);
  await check(staged.length === 1, `one new puzzle staged (${staged.map((p) => p.date)})`);
  const date = staged[0].date;
  await check(eq(titles(staged[0]), ["Mustache styles", "Cookies 3", "Things with keys", "Martinis*"]), `staged as on the board: ${titles(staged[0])}`);
  const tp = await post(T, "/login", { name: "Cy", password: "test" });
  const tday = (await get(T, "/today", tp.token)).puzzle;
  await check(tday.words.includes("Snickerdoodle") && tday.words.includes("English"), "the tester's today is the staged puzzle");
  await check(md5(LIVE_FILE) === liveBefore, "live puzzles file unchanged by staging");
  await check(eq((await get(L, "/today", bea.token)).puzzle.words, today.words), "live players still get today's puzzle");

  // Publish.
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await shot("publish-dialog");
  await page.getByRole("dialog").getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByText("Published!").waitFor();
  const published = (json(LIVE_FILE) as Puzzle[]).find((p) => p.date === date);
  await check(published && eq(titles(published), ["Mustache styles", "Cookies 3", "Things with keys", "Martinis*"]), `published on ${date} as staged`);
  await check(!(json(STAGED_FILE) as Puzzle[]).some((p) => p.date === date), "and unstaged");
  await check((json(STAGED_FILE) as Puzzle[]).length === 1, "the stale staged puzzle is still there");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByText("Coming up").waitFor();

  // Today's: published with its stache group second, and played. Opening it
  // changes nothing; changing only its push line keeps its games.
  await check(eq(titles(liveToday), ["Kitchen tools", "Famous mustaches*", "Card games", "Planets"]), "today's has its stache second in the file");
  await check(psql(`select count(*) from plays p join puzzles z on z.id = p.puzzle_id where z.date = '${today.date}'`) === "1", "today's has a game");
  await page.locator("ul li button", { hasText: "Today" }).first().click();
  await page.getByText("played it.").waitFor();
  await shot("today-opened");
  await check(eq(await boardTitles(), ["Kitchen tools", "Card games", "Planets", "Famous mustaches*"]), `shown stache last: ${await boardTitles()}`);
  await check((await status()) === "Published, no changes", `opening it is no change (status: ${await status()})`);
  await page.locator('[data-field="push"]').fill("A new line for today");
  await blur();
  await check((await status()) === "Not staged yet", `push-line change: ${await status()}`);
  await page.getByRole("button", { name: "Stage", exact: true }).click();
  await toast.waitFor();
  await page.getByRole("button", { name: "Publish changes" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await shot("today-publish-dialog");
  await check((await dialog.getByRole("checkbox").count()) === 0, "no Delete N games tick");
  await check(await dialog.getByText("Changes only its push line, so its games stay.").isVisible(), "it says its games stay");
  const go = dialog.getByRole("button", { name: "Publish", exact: true });
  await check(await go.isEnabled(), "Publish is enabled");
  await go.click();
  await page.getByText("Published!").waitFor();
  await shot("today-published");
  const after = (json(LIVE_FILE) as Puzzle[]).find((p) => p.date === today.date) as Puzzle;
  await check(eq(titles(after), titles(liveToday)), `today's groups and order unchanged: ${titles(after)}`);
  await check(after.push === "A new line for today", `today's push line changed: ${after.push}`);
  await check(psql(`select count(*) from plays p join puzzles z on z.id = p.puzzle_id where z.date = '${today.date}'`) === "1", "today's game is still there");
  await check(psql(`select push from puzzles where date = '${today.date}'`) === "A new line for today", "and Postgres has the new line");

  await check(errors.length === 0, `no console errors (${errors.join(" | ")})`);
} finally {
  await browser.close();
}
