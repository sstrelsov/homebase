import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "bun";
import QUOTES from "../src/stached/quotes.json";
import { addDays } from "./leaderboard";
import { migrate } from "./migrate";
import {
  type Announced,
  announce,
  announceDue,
  newYorkTime,
  notification,
  parseSubscription,
  pushCopy,
} from "./push";
import { type DayPuzzle, released, syncPuzzles, todays } from "./puzzles";
import examples from "./puzzles.example.json";
import { base64url, generateVapidKeys } from "./webpush";

// 9:12am in New York on Friday, October 2 (daylight time), and on Monday,
// November 2 (standard time).
const FRI_912 = new Date("2026-10-02T13:12:00Z");
const MON_912 = new Date("2026-11-02T14:12:00Z");
const minutes = (date: Date, n: number) =>
  new Date(date.getTime() + n * 60_000);

describe("a puzzle's push", () => {
  test("is due from 9:12am New York time on its date", () => {
    expect(announceDue("2026-10-02", minutes(FRI_912, -1))).toBe(false);
    expect(announceDue("2026-10-02", FRI_912)).toBe(true);
    expect(announceDue("2026-10-02", minutes(FRI_912, 14 * 60))).toBe(true);
    expect(announceDue("2026-11-02", minutes(MON_912, -1))).toBe(false);
    expect(announceDue("2026-11-02", MON_912)).toBe(true);
  });

  test("isn't due on any other day", () => {
    expect(announceDue("2026-10-03", FRI_912)).toBe(false);
    expect(announceDue("2026-10-01", FRI_912)).toBe(false);
  });

  test("is due right away after its day's push, while that still counts", () => {
    // Thursday's went out at 11:31pm; Wednesday's joins it at 12:21am.
    const thursdayPush = new Date("2026-10-02T03:31:00Z");
    const after = new Date("2026-10-02T04:21:00Z");
    expect(announceDue("2026-10-01", after)).toBe(false);
    expect(announceDue("2026-10-01", after, thursdayPush)).toBe(true);
    expect(announceDue("2026-10-01", minutes(thursdayPush, 24 * 60))).toBe(
      false,
    );
    expect(
      announceDue("2026-10-01", minutes(thursdayPush, 24 * 60), thursdayPush),
    ).toBe(false);
  });

  // A puzzle out on Friday, October 2, and Thursday's, caught up with it.
  const friday = (number: number, push?: string | null) => ({
    number,
    date: "2026-10-02",
    out: "2026-10-02",
    push,
  });
  const thursday = (number: number, push?: string | null) => ({
    ...friday(number, push),
    date: "2026-10-01",
  });

  test("names the puzzle, then one of home's quotes", () => {
    expect(notification([friday(12)]).title).toBe("Puzzle #12 is up");
    expect(QUOTES).toContain(notification([friday(12)]).body);
    expect(QUOTES).toContain(notification([friday(12, null)]).body);
  });

  test("says the puzzle's own line, if it has one", () => {
    expect(notification([friday(12, "Read all about it")])).toEqual({
      title: "Puzzle #12 is up",
      body: "Read all about it",
    });
  });

  test("names every puzzle out together, with the oldest one's own line", () => {
    expect(notification([thursday(17, "Catch up"), friday(18, "New")])).toEqual(
      { title: "Puzzles #17 and #18 are up", body: "Catch up" },
    );
    // The oldest has no line of its own, so they're named by their days,
    // not by the next one's line.
    expect(notification([thursday(17), friday(18, "New")]).body).toBe(
      "Friday's puzzle and Thursday's missed puzzle.",
    );
    expect(notification([thursday(17), thursday(18), friday(19)]).title).toBe(
      "Puzzles #17, #18, and #19 are up",
    );
  });

  test("calls a missed day's an extra puzzle, by its own day, with the ones still up", () => {
    // Friday's went out at 9:12 as #12; Thursday's comes out that evening.
    expect(pushCopy([thursday(13)], [friday(12)])).toEqual({
      title: "Extra puzzle: #13 is up",
      line: "Thursday's missed puzzle. Friday's is still up too.",
    });
    const wednesday = { ...thursday(13), date: "2026-09-30" };
    expect(pushCopy([wednesday, { ...thursday(14) }], [friday(12)])).toEqual({
      title: "Extra puzzles: #13 and #14 are up",
      line: "Wednesday's and Thursday's missed puzzles. Friday's is still up too.",
    });
    // Alone, before a day's own is out: still an extra, never today's.
    expect(pushCopy([thursday(12)])).toEqual({
      title: "Extra puzzle: #12 is up",
      line: "Thursday's missed puzzle.",
    });
    // A week or more back, it goes by its date, not "Friday's".
    expect(
      pushCopy([{ ...thursday(13), date: "2026-09-25" }], [friday(12)]).line,
    ).toBe("Sep 25's missed puzzle. Friday's is still up too.");
    expect(
      pushCopy([{ ...thursday(13), date: "2026-09-26" }], [friday(12)]).line,
    ).toStartWith("Saturday's missed puzzle.");
    // Its own line wins, and the title still says it's extra.
    expect(notification([thursday(13, "Better late")], [friday(12)])).toEqual({
      title: "Extra puzzle: #13 is up",
      body: "Better late",
    });
  });

  test("never calls a day's own an extra, even after a missed day's push that day", () => {
    // Wednesday's went out first, as #16; Friday's own comes that evening.
    const wednesday = { ...thursday(16), date: "2026-09-30" };
    expect(pushCopy([friday(17)], [wednesday])).toEqual({
      title: "Puzzle #17 is up",
      line: "Friday's puzzle. Wednesday's is still up too.",
    });
    expect(pushCopy([friday(17)], [{ ...thursday(15) }, wednesday]).line).toBe(
      "Friday's puzzle. Thursday's and Wednesday's are still up too.",
    );
    // Its own line wins.
    expect(notification([friday(17, "Back on track")], [wednesday])).toEqual({
      title: "Puzzle #17 is up",
      body: "Back on track",
    });
    // Out with a missed day's, it names both by their days.
    expect(pushCopy([friday(17), thursday(18)])).toEqual({
      title: "Puzzles #17 and #18 are up",
      line: "Friday's puzzle and Thursday's missed puzzle.",
    });
  });
});

describe("a subscription", () => {
  const keys = {
    p256dh: base64url.encode(Uint8Array.of(4, ...new Uint8Array(64))),
    auth: base64url.encode(new Uint8Array(16)),
  };
  const at = (endpoint: string) => parseSubscription({ endpoint, keys });

  test("is taken from the push services browsers use", () => {
    for (const endpoint of [
      "https://web.push.apple.com/QGuQyavXutnMH1Ocg",
      "https://fcm.googleapis.com/fcm/send/dpH5lCsTSSM",
      "https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB",
    ])
      expect(at(endpoint)).toEqual({ endpoint, ...keys });
  });

  test("isn't taken anywhere else, or with bad keys", () => {
    expect(at("https://my-mac.example.ts.net/x")).toBeNull();
    expect(at("http://web.push.apple.com/x")).toBeNull();
    expect(at("https://web.push.apple.com.evil.example/x")).toBeNull();
    expect(at("not a url")).toBeNull();
    expect(
      parseSubscription({
        endpoint: "https://web.push.apple.com/x",
        keys: { ...keys, auth: "short" },
      }),
    ).toBeNull();
    expect(parseSubscription({})).toBeNull();
  });
});

// The rest runs against a throwaway Postgres, as `make phone` does.
const initdb = Bun.which("initdb", {
  PATH: `${process.env.PATH}:/opt/homebrew/opt/postgresql@17/bin`,
});

describe.skipIf(!initdb)("announcing, with Postgres", () => {
  const dir = mkdtempSync(join(tmpdir(), "stached-test-"));
  const bin = (tool: string) => join(initdb as string, "..", tool);
  const port = 50_000 + Math.floor(Math.random() * 10_000);
  const puzzle = [{ number: 4, date: "2026-10-02", out: "2026-10-02" }];
  /** A day's puzzles, as an announcer reads them. */
  const day = (puzzles: Announced[]) => async () => puzzles;
  /** The puzzles claimed for a push, by date, from a date on. */
  const claimedSince = async (date: string) =>
    (
      await sql`
        select to_char(date, 'YYYY-MM-DD') as date from announcements
        where date >= ${date} order by date`
    ).map((row: { date: string }) => row.date);
  // A fake push service: /gone answers like a subscription that's been
  // dropped, /down like an outage.
  const received: { path: string; headers: Record<string, string> }[] = [];
  const pushService = Bun.serve({
    port: 0,
    fetch(req) {
      const path = new URL(req.url).pathname;
      received.push({ path, headers: req.headers.toJSON() });
      return new Response(null, {
        status: path === "/gone" ? 410 : path === "/down" ? 500 : 201,
      });
    },
  });

  beforeAll(async () => {
    const run = (tool: string, ...args: string[]) => {
      const result = spawnSync(bin(tool), args, { encoding: "utf8" });
      if (result.status !== 0) throw new Error(result.stderr);
    };
    run("initdb", "-D", `${dir}/pg`, "-U", "postgres", "--auth=trust");
    run(
      "pg_ctl",
      ...["-D", `${dir}/pg`, "-l", `${dir}/log`, "-w", "start"],
      ...["-o", `-p ${port} -k '' -c listen_addresses=localhost`],
    );
    process.env.DATABASE_URL = `postgres://postgres@localhost:${port}/postgres`;
    await migrate();
    await sql`insert into users (name) values ('Gerald')`;
  });

  afterAll(async () => {
    pushService.stop();
    await sql.close();
    spawnSync(bin("pg_ctl"), ["-D", `${dir}/pg`, "stop", "-m", "fast"]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("waits until the push is due, then announces it once", async () => {
    const keys = await generateVapidKeys();
    expect(await announce(day(puzzle), keys, minutes(FRI_912, -1))).toBe(false);
    // Two API processes at once, say, or one restarting: one claim wins.
    const tries = await Promise.all(
      [0, 1, 2, 3, 4].map(() => announce(day(puzzle), keys, FRI_912)),
    );
    expect(tries.filter(Boolean)).toHaveLength(1);
    expect(await announce(day(puzzle), keys, minutes(FRI_912, 60))).toBe(false);
    const rows = await sql`select * from announcements`;
    expect(rows).toHaveLength(1);
  });

  test("pushes to every subscription and drops the ones that are gone", async () => {
    const keys = await generateVapidKeys();
    const browser = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    );
    const p256dh = base64url.encode(
      new Uint8Array(await crypto.subtle.exportKey("raw", browser.publicKey)),
    );
    const auth = base64url.encode(crypto.getRandomValues(new Uint8Array(16)));
    for (const path of ["/ok", "/gone", "/down"])
      await sql`
        insert into push_subscriptions (endpoint, user_id, p256dh, auth)
        values (${`${pushService.url}${path.slice(1)}`}, 1, ${p256dh}, ${auth})`;

    const saturday = [{ number: 5, date: "2026-10-03", out: "2026-10-03" }];
    expect(await announce(day(saturday), keys, minutes(FRI_912, 24 * 60))).toBe(
      true,
    );
    expect(received.map((req) => req.path).sort()).toEqual([
      "/down",
      "/gone",
      "/ok",
    ]);
    for (const { headers } of received) {
      expect(headers["content-encoding"]).toBe("aes128gcm");
      expect(headers.authorization).toStartWith("vapid t=");
      expect(Number(headers.ttl)).toBeGreaterThan(0);
    }
    const left = await sql`select endpoint from push_subscriptions`;
    expect(
      left
        .map((r: { endpoint: string }) => new URL(r.endpoint).pathname)
        .sort(),
    ).toEqual(["/down", "/ok"]);
  });

  test("announces a missed day's puzzle with the day's it came out with, in one push", async () => {
    const keys = await generateVapidKeys();
    // Monday was missed, and caught up on Tuesday, October 6, before its push.
    const tuesday = minutes(FRI_912, 4 * 24 * 60);
    const out = "2026-10-06";
    const both = [
      { number: 6, date: "2026-10-05", out },
      { number: 7, date: out, out },
    ];
    expect(await announce(day(both), keys, tuesday)).toBe(true);
    expect(await claimedSince("2026-10-05")).toEqual(["2026-10-05", out]);
    // Neither is pushed again, together or alone.
    expect(await announce(day(both), keys, minutes(tuesday, 60))).toBe(false);
    expect(await announce(day(both.slice(0, 1)), keys, tuesday)).toBe(false);
    expect(await announce(day(both.slice(1)), keys, tuesday)).toBe(false);
    expect(await announce(day([]), keys, tuesday)).toBe(false);
  });

  test("gives a missed day's added after the day's push a push of its own, and never re-announces one", async () => {
    const keys = await generateVapidKeys();
    // Thursday, October 8: Thursday's went out at 9:12 as #8. That evening
    // Wednesday's is caught up, as #9.
    const thursday = minutes(FRI_912, 6 * 24 * 60);
    const out = "2026-10-08";
    const own = { number: 8, date: out, out };
    const caughtUp = { number: 9, date: "2026-10-07", out };
    expect(await announce(day([own]), keys, thursday)).toBe(true);
    const logged = spyOn(console, "log");
    expect(
      await announce(day([own, caughtUp]), keys, minutes(thursday, 600)),
    ).toBe(true);
    expect(logged.mock.calls[0][0]).toStartWith("Announced #9:");
    logged.mockRestore();
    expect(await claimedSince("2026-10-07")).toEqual(["2026-10-07", out]);
    // Every one of the day's is announced now: nothing goes out again.
    expect(
      await announce(day([own, caughtUp]), keys, minutes(thursday, 601)),
    ).toBe(false);
  });

  test("takes turns with another announcer, which reads the day only once it's its turn", async () => {
    const keys = await generateVapidKeys();
    // Tuesday, October 20, just after 9:12: the API's check and a confirm at
    // once, the confirm having just added Monday's.
    const at = minutes(FRI_912, 18 * 24 * 60 + 5);
    const out = "2026-10-20";
    const own = { number: 20, date: out, out };
    const caughtUp = { number: 21, date: "2026-10-19", out };
    const said: string[] = [];
    // The confirm starts once the API's check has its turn and is reading.
    const { promise: apiReading, resolve } = Promise.withResolvers<void>();
    const reads = (who: string, puzzles: Announced[]) => async () => {
      said.push(`${who} reads`);
      resolve();
      await Bun.sleep(50);
      said.push(`${who} has read`);
      return puzzles;
    };
    const logged = spyOn(console, "log");
    expect(
      await Promise.all([
        announce(reads("api", [own]), keys, at),
        apiReading.then(() =>
          announce(reads("confirm", [own, caughtUp]), keys, at),
        ),
      ]),
    ).toEqual([true, true]);
    expect(said).toEqual([
      "api reads",
      "api has read",
      "confirm reads",
      "confirm has read",
    ]);
    // The confirm saw today's claimed, so Monday's went out alone, after it.
    expect(
      logged.mock.calls
        .map((call) => String(call[0]))
        .filter((line) => line.startsWith("Announced"))
        .map((line) => line.split(":")[0]),
    ).toEqual(["Announced #20", "Announced #21"]);
    logged.mockRestore();
    const [first, second] = await sql`
      select to_char(date, 'YYYY-MM-DD') as date from announcements
      where date >= '2026-10-19' order by sent_at`;
    expect([first.date, second.date]).toEqual([out, "2026-10-19"]);
  });

  test("changing a puzzle's push line keeps its games", async () => {
    const sample = examples[0] as DayPuzzle;
    const pushOf = async () =>
      (await sql`select push from puzzles where date = ${sample.date}`)[0].push;
    const games = async () => (await sql`select * from plays`).length;
    await syncPuzzles([{ ...sample, push: "Read all about it" }]);
    expect(await pushOf()).toBe("Read all about it");
    await sql`insert into plays (user_id, puzzle_id) select 1, id from puzzles`;
    await syncPuzzles([{ ...sample, push: "Extra, extra" }]);
    expect(await pushOf()).toBe("Extra, extra");
    await syncPuzzles([sample]);
    expect(await pushOf()).toBeNull();
    expect(await games()).toBe(1);
    // The words changing still clears them.
    const edited = structuredClone(sample);
    edited.groups[0].words[0] = "Crumpet";
    await syncPuzzles([edited]);
    expect(await games()).toBe(0);
  });

  describe("released puzzles", () => {
    const sample = examples[0] as DayPuzzle;
    const puzzle = (date: string, out?: string): DayPuzzle => ({
      ...sample,
      date,
      ...(out && { out }),
    });
    const keys = generateVapidKeys();
    /** A time in New York, daylight time unless it says otherwise. */
    const ny = (time: string, offset = "-04:00") =>
      new Date(`${time}${offset}`);
    /** Each puzzle out then: its date, number, and whether it's today's. */
    const state = async (now = new Date()) =>
      (
        await sql`
          select date, number, today from ${released(now)}
          order by number`
      ).map((p: { date: string; number: number; today: boolean }) => [
        p.date,
        p.number,
        p.today,
      ]);
    const pushedAt = (date: string, sentAt: Date) => sql`
      insert into announcements (date, sent_at) values (${date}, ${sentAt})
      on conflict (date) do update set sent_at = excluded.sent_at`;
    /** Announces the day's puzzles then, and says which it claimed. */
    const announced = async (now: Date) => {
      const logged = spyOn(console, "log");
      await announce(() => todays(now), await keys, now);
      const lines = logged.mock.calls
        .map((call) => String(call[0]))
        .filter((line) => line.startsWith("Announced"));
      logged.mockRestore();
      return lines.map((line) => line.split(":")[0]);
    };
    /** Announces the day's puzzles then, and says the push's copy. */
    const copyOf = async (now: Date) => {
      const logged = spyOn(console, "log");
      await announce(() => todays(now), await keys, now);
      const lines = logged.mock.calls.map((call) => String(call[0]));
      logged.mockRestore();
      return lines[lines.findIndex((l) => l.startsWith("Announced")) + 1];
    };
    // The pushes the tests above made, on dates that may be these.
    beforeEach(async () => {
      await sql`delete from announcements`;
    });

    test("numbers the live game's puzzles as before, and Monday's caught up after Tuesday's push #14", async () => {
      // Shaped like the live game on Tuesday, October 13, made up: a puzzle
      // a day from September 29 but October 9 and 12, #1 and #2 from before
      // pushes, and #3 on pushed at 9:12am on their day.
      const dates = [
        ..."29 30".split(" ").map((d) => `2026-09-${d}`),
        ..."01 02 03 04 05 06 07 08 10 11 13"
          .split(" ")
          .map((d) => `2026-10-${d}`),
      ];
      await syncPuzzles(dates.map((date) => puzzle(date)));
      for (const date of dates.slice(2))
        await pushedAt(date, ny(`${date}T09:12:00`));
      const evening = ny("2026-10-13T20:30:00");
      const live = dates.map((date, i) => [date, i + 1, i === 12]);
      expect(await state(evening)).toEqual(live);
      // Monday's comes out that evening, after Tuesday's push, with its own.
      await syncPuzzles([
        ...dates.map((date) => puzzle(date)),
        puzzle("2026-10-12", "2026-10-13"),
      ]);
      const withMonday = [...live, ["2026-10-12", 14, true]];
      expect(await state(evening)).toEqual(withMonday);
      expect(await announced(evening)).toEqual(["Announced #14"]);
      expect(await state(evening)).toEqual(withMonday);
      expect(await announced(evening)).toEqual([]);
    });

    test("a missed day's caught up in the evening stays one of today's for its 24 hours, though the next day's is out", async () => {
      // Tuesday's went out at 9:12 as #2, Monday's at 8:30pm as #3, and
      // Wednesday's was published ahead.
      await syncPuzzles([
        puzzle("2026-10-11"),
        puzzle("2026-10-12", "2026-10-13"),
        puzzle("2026-10-13"),
        puzzle("2026-10-14"),
      ]);
      await pushedAt("2026-10-11", ny("2026-10-11T09:12:00"));
      await pushedAt("2026-10-13", ny("2026-10-13T09:12:00"));
      await pushedAt("2026-10-12", ny("2026-10-13T20:30:00"));
      expect(await state(ny("2026-10-13T21:00:00"))).toEqual([
        ["2026-10-11", 1, false],
        ["2026-10-13", 2, true],
        ["2026-10-12", 3, true],
      ]);
      // Wednesday, before its push: Tuesday's counts till 9:12, as ever,
      // and Monday's till 8:30pm, all on home.
      expect(await state(ny("2026-10-14T08:00:00"))).toEqual([
        ["2026-10-11", 1, false],
        ["2026-10-13", 2, true],
        ["2026-10-12", 3, true],
        ["2026-10-14", 4, true],
      ]);
      // Wednesday's push names Wednesday's alone, and not as an extra.
      const nineTwelve = ny("2026-10-14T09:12:00");
      expect(await todays(nineTwelve)).toEqual([
        {
          number: 4,
          date: "2026-10-14",
          out: "2026-10-14",
          push: null,
          pushed: null,
        },
      ]);
      expect(await announced(nineTwelve)).toEqual(["Announced #4"]);
      await pushedAt("2026-10-14", nineTwelve);
      expect(await state(ny("2026-10-14T20:29:00"))).toEqual([
        ["2026-10-11", 1, false],
        ["2026-10-13", 2, false],
        ["2026-10-12", 3, true],
        ["2026-10-14", 4, true],
      ]);
      expect(await state(ny("2026-10-14T20:31:00"))).toEqual([
        ["2026-10-11", 1, false],
        ["2026-10-13", 2, false],
        ["2026-10-12", 3, false],
        ["2026-10-14", 4, true],
      ]);
      const [{ until }] = await sql`
        select until from ${released(nineTwelve)} where date = '2026-10-12'`;
      expect(until).toEqual(ny("2026-10-14T20:30:00"));
    });

    test("a day's own pushed late, alone, stays one of today's for its 24 hours, once the next is out", async () => {
      await syncPuzzles([puzzle("2026-10-13"), puzzle("2026-10-14")]);
      await pushedAt("2026-10-13", ny("2026-10-13T15:00:00"));
      expect(await state(ny("2026-10-14T12:00:00"))).toEqual([
        ["2026-10-13", 1, true],
        ["2026-10-14", 2, true],
      ]);
    });

    test("a missed day's caught up just after midnight pairs with yesterday's, and the next day's own is no extra", async () => {
      // Shaped like Thursday, October 15, made up: Thursday's own went out
      // at 11:31pm as #2. At 12:21am Wednesday's is caught up, with
      // Thursday's (catchUpDay), as #3.
      const before = [puzzle("2026-10-13"), puzzle("2026-10-15")];
      const wednesday = puzzle("2026-10-14", "2026-10-15");
      await syncPuzzles([...before, wednesday]);
      await pushedAt("2026-10-13", ny("2026-10-13T09:12:00"));
      await pushedAt("2026-10-15", ny("2026-10-15T23:31:00"));
      // It pushes right away, though its day has passed, as an extra.
      const midnight = ny("2026-10-16T00:21:00");
      expect(await copyOf(midnight)).toBe(
        "  Extra puzzle: #3 is up · Wednesday's missed puzzle. Thursday's is still up too.",
      );
      await pushedAt("2026-10-14", midnight);
      // A double header on home, and nothing new at 9:12.
      expect(await state(ny("2026-10-16T09:12:00"))).toEqual([
        ["2026-10-13", 1, false],
        ["2026-10-15", 2, true],
        ["2026-10-14", 3, true],
      ]);
      expect(await announced(ny("2026-10-16T09:12:00"))).toEqual([]);
      // Friday's own, published at 9pm, is #4, alone on its day: a plain
      // push, with a quote.
      await syncPuzzles([...before, wednesday, puzzle("2026-10-16")]);
      const evening = ny("2026-10-16T21:00:00");
      expect(await copyOf(evening)).toStartWith("  Puzzle #4 is up · ");
      await pushedAt("2026-10-16", evening);
      // All three are on home till Thursday's 24 hours are up, then
      // Wednesday's till 12:21am.
      expect(await state(ny("2026-10-16T23:30:00"))).toEqual([
        ["2026-10-13", 1, false],
        ["2026-10-15", 2, true],
        ["2026-10-14", 3, true],
        ["2026-10-16", 4, true],
      ]);
      expect(await state(ny("2026-10-16T23:32:00"))).toEqual([
        ["2026-10-13", 1, false],
        ["2026-10-15", 2, false],
        ["2026-10-14", 3, true],
        ["2026-10-16", 4, true],
      ]);
      expect(await state(ny("2026-10-17T00:22:00"))).toEqual([
        ["2026-10-13", 1, false],
        ["2026-10-15", 2, false],
        ["2026-10-14", 3, false],
        ["2026-10-16", 4, true],
      ]);
    });

    test("filed as live has it, a missed day's out with the day's own is no extra, and moving it to yesterday keeps every number, push and game", async () => {
      // As it went live: Wednesday's, caught up at 12:21am, came out Friday
      // and took Friday's 9:12 push as #3. Friday's own comes at 9pm.
      const before = [puzzle("2026-10-13"), puzzle("2026-10-15")];
      const friday = puzzle("2026-10-16");
      await syncPuzzles([
        ...before,
        puzzle("2026-10-14", "2026-10-16"),
        friday,
      ]);
      await pushedAt("2026-10-13", ny("2026-10-13T09:12:00"));
      await pushedAt("2026-10-15", ny("2026-10-15T23:31:00"));
      await pushedAt("2026-10-14", ny("2026-10-16T09:12:00"));
      await sql`insert into plays (user_id, puzzle_id) select 1, id from puzzles`;
      const evening = ny("2026-10-16T21:00:00");
      expect(await state(evening)).toEqual([
        ["2026-10-13", 1, false],
        ["2026-10-15", 2, true],
        ["2026-10-14", 3, true],
        ["2026-10-16", 4, true],
      ]);
      expect(await copyOf(evening)).toBe(
        "  Puzzle #4 is up · Friday's puzzle. Wednesday's is still up too.",
      );
      await sql`delete from announcements where date = '2026-10-16'`;
      // Moved to Thursday (`stached out`), with Friday's not yet pushed.
      const moved = [...before, puzzle("2026-10-14", "2026-10-15"), friday];
      const announcements =
        await sql`select * from announcements order by date`;
      for (const _ of [1, 2]) {
        await syncPuzzles(moved);
        expect(await state(evening)).toEqual([
          ["2026-10-13", 1, false],
          ["2026-10-15", 2, true],
          ["2026-10-14", 3, true],
          ["2026-10-16", 4, true],
        ]);
        expect(await sql`select * from announcements order by date`).toEqual(
          announcements,
        );
        expect((await sql`select * from plays`).length).toBe(4);
      }
      // Friday's own is alone on its day now: a plain push, no extra.
      expect(await copyOf(evening)).toStartWith("  Puzzle #4 is up · ");
      await sql`delete from plays`;
    });

    test("two missed days caught up at once after the push share an extra push; one at a time, each gets its own", async () => {
      const own = puzzle("2026-10-12");
      const saturday = puzzle("2026-10-10", "2026-10-12");
      const sunday = puzzle("2026-10-11", "2026-10-12");
      await syncPuzzles([puzzle("2026-10-09"), own, saturday, sunday]);
      await pushedAt("2026-10-09", ny("2026-10-09T09:12:00"));
      await pushedAt("2026-10-12", ny("2026-10-12T09:12:00"));
      expect(await announced(ny("2026-10-12T18:00:00"))).toEqual([
        "Announced #3 and #4",
      ]);
      // One at a time: Saturday's at 6pm, then Sunday's at 8pm.
      await sql`delete from announcements where date in ('2026-10-10', '2026-10-11')`;
      await syncPuzzles([puzzle("2026-10-09"), own, saturday]);
      expect(await announced(ny("2026-10-12T18:00:00"))).toEqual([
        "Announced #3",
      ]);
      await pushedAt("2026-10-10", ny("2026-10-12T18:00:00"));
      await syncPuzzles([puzzle("2026-10-09"), own, saturday, sunday]);
      expect(await announced(ny("2026-10-12T20:00:00"))).toEqual([
        "Announced #4",
      ]);
      await pushedAt("2026-10-11", ny("2026-10-12T20:00:00"));
      // The next day, before its own is out, each still counts till its
      // own push's hour.
      await syncPuzzles([
        puzzle("2026-10-09"),
        own,
        saturday,
        sunday,
        puzzle("2026-10-13"),
      ]);
      expect(await state(ny("2026-10-13T19:00:00"))).toEqual([
        ["2026-10-09", 1, false],
        ["2026-10-12", 2, false],
        ["2026-10-10", 3, false],
        ["2026-10-11", 4, true],
        ["2026-10-13", 5, true],
      ]);
    });

    test("a push's puzzles are claimed at one time, so none is an extra, and numbered as they were", async () => {
      // Saturday's and Sunday's caught up Monday morning, before the push.
      await syncPuzzles([
        puzzle("2026-10-09"),
        puzzle("2026-10-10", "2026-10-12"),
        puzzle("2026-10-11", "2026-10-12"),
        puzzle("2026-10-12"),
      ]);
      expect(await state(ny("2026-10-12T09:00:00"))).toEqual([
        ["2026-10-09", 1, false],
        ["2026-10-12", 2, true],
        ["2026-10-10", 3, true],
        ["2026-10-11", 4, true],
      ]);
      expect(await announced(ny("2026-10-12T09:12:00"))).toEqual([
        "Announced #2, #3, and #4",
      ]);
      const stamps = await sql`
        select distinct sent_at from announcements
        where date >= '2026-10-10'`;
      expect(stamps).toHaveLength(1);
      // As the push really went out at 9:12: the next day, once Tuesday's
      // is out, they stay today's till 9:12.
      await sql`update announcements set sent_at = ${ny("2026-10-12T09:12:00")}`;
      await syncPuzzles([
        puzzle("2026-10-09"),
        puzzle("2026-10-10", "2026-10-12"),
        puzzle("2026-10-11", "2026-10-12"),
        puzzle("2026-10-12"),
        puzzle("2026-10-13"),
      ]);
      expect(await state(ny("2026-10-13T09:00:00"))).toEqual([
        ["2026-10-09", 1, false],
        ["2026-10-12", 2, true],
        ["2026-10-10", 3, true],
        ["2026-10-11", 4, true],
        ["2026-10-13", 5, true],
      ]);
    });

    test("counts 24 hours from the push across the end of daylight time", async () => {
      // Friday, October 30, caught up Saturday at 8:30pm daylight time; the
      // clocks go back that night.
      await syncPuzzles([
        puzzle("2026-10-30", "2026-10-31"),
        puzzle("2026-10-31"),
        puzzle("2026-11-01"),
      ]);
      await pushedAt("2026-10-31", ny("2026-10-31T09:12:00"));
      await pushedAt("2026-10-30", ny("2026-10-31T20:30:00"));
      const [{ until }] = await sql`
        select until from ${released(ny("2026-11-01T12:00:00", "-05:00"))}
        where date = '2026-10-30'`;
      // 7:30pm standard time, a full 24 hours on.
      expect(until).toEqual(ny("2026-11-01T19:30:00", "-05:00"));
      expect(await state(ny("2026-11-01T19:29:00", "-05:00"))).toEqual([
        ["2026-10-31", 1, false],
        ["2026-10-30", 2, true],
        ["2026-11-01", 3, true],
      ]);
      expect((await state(ny("2026-11-01T19:31:00", "-05:00")))[1]).toEqual([
        "2026-10-30",
        2,
        false,
      ]);
    });

    test("a missed day's caught up before the push is today's, after the day's own", async () => {
      const today = newYorkTime().slice(0, 10);
      const ago = (days: number) => addDays(today, -days);
      await syncPuzzles([puzzle(ago(3)), puzzle(ago(2), today), puzzle(today)]);
      const outs = await sql`
        select to_char(out, 'YYYY-MM-DD') as out from puzzles order by date`;
      expect(outs).toEqual([{ out: null }, { out: today }, { out: null }]);
      expect(await state()).toEqual([
        [ago(3), 1, false],
        [today, 2, true],
        [ago(2), 3, true],
      ]);
    });

    test("a puzzle dated before today that came out on its own day isn't a catch-up", async () => {
      // No puzzle today yet, so yesterday's is still today's. Its push never
      // went out (push was off, say): it isn't pushed today as a catch-up.
      const today = newYorkTime().slice(0, 10);
      const ago = (days: number) => addDays(today, -days);
      const evening = new Date(`${today}T20:00:00-04:00`);
      await syncPuzzles([puzzle(ago(2)), puzzle(ago(1))]);
      expect(await state()).toEqual([
        [ago(2), 1, false],
        [ago(1), 2, true],
      ]);
      expect(await todays()).toEqual([
        { number: 2, date: ago(1), out: ago(1), push: null, pushed: null },
      ]);
      expect(await announced(evening)).toEqual([]);
      expect(await claimedSince(ago(2))).toEqual([]);
    });
  });
});
