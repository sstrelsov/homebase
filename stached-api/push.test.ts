import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "bun";
import QUOTES from "../src/stached/quotes.json";
import { migrate } from "./migrate";
import {
  announce,
  announceDue,
  newYorkTime,
  notification,
  parseSubscription,
} from "./push";
import { type DayPuzzle, released, syncPuzzles } from "./puzzles";
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
    // The oldest has no line of its own, so it's a quote, not the next one's.
    expect(QUOTES).toContain(
      notification([thursday(17), friday(18, "New")]).body,
    );
    expect(notification([thursday(17), thursday(18), friday(19)]).title).toBe(
      "Puzzles #17, #18, and #19 are up",
    );
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
    expect(await announce(puzzle, keys, minutes(FRI_912, -1))).toBe(false);
    // Two API processes at once, say, or one restarting: one claim wins.
    const tries = await Promise.all(
      [0, 1, 2, 3, 4].map(() => announce(puzzle, keys, FRI_912)),
    );
    expect(tries.filter(Boolean)).toHaveLength(1);
    expect(await announce(puzzle, keys, minutes(FRI_912, 60))).toBe(false);
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
    expect(await announce(saturday, keys, minutes(FRI_912, 24 * 60))).toBe(
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

  test("announces a missed day's puzzle with the day's it came out with, claiming both dates", async () => {
    const keys = await generateVapidKeys();
    // Monday was missed, and caught up on Tuesday, October 6.
    const tuesday = minutes(FRI_912, 4 * 24 * 60);
    const out = "2026-10-06";
    const both = [
      { number: 6, date: "2026-10-05", out },
      { number: 7, date: out, out },
    ];
    expect(await announce(both, keys, tuesday)).toBe(true);
    const claimed = await sql`
      select to_char(date, 'YYYY-MM-DD') as date from announcements
      where date >= '2026-10-05' order by date`;
    expect(claimed.map((r: { date: string }) => r.date)).toEqual([
      "2026-10-05",
      out,
    ]);
    // Neither date is pushed again, together or alone.
    expect(await announce(both, keys, minutes(tuesday, 60))).toBe(false);
    expect(await announce(both.slice(0, 1), keys, tuesday)).toBe(false);
    expect(await announce(both.slice(1), keys, tuesday)).toBe(false);
    expect(await announce([], keys, tuesday)).toBe(false);
  });

  test("never pushes a day again when a puzzle joins it after its push", async () => {
    const keys = await generateVapidKeys();
    // Wednesday's caught up on Thursday, October 8, and pushed; then
    // Thursday's own puzzle comes out too.
    const thursday = minutes(FRI_912, 6 * 24 * 60);
    const out = "2026-10-08";
    const caughtUp = { number: 8, date: "2026-10-07", out };
    expect(await announce([caughtUp], keys, thursday)).toBe(true);
    expect(
      await announce([caughtUp, { number: 9, date: out, out }], keys, thursday),
    ).toBe(false);
    // All or nothing: Thursday's date isn't claimed by the push that failed.
    const claimed = await sql`select 1 from announcements where date = ${out}`;
    expect(claimed).toHaveLength(0);
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

  test("a missed day's puzzle is today's while it's new, and counts for a day after its push", async () => {
    const sample = examples[0] as DayPuzzle;
    const today = newYorkTime().slice(0, 10);
    const ago = (days: number) => {
      const date = new Date(`${today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() - days);
      return date.toISOString().slice(0, 10);
    };
    const puzzle = (date: string, out?: string): DayPuzzle => ({
      ...sample,
      date,
      ...(out && { out }),
    });
    const releasedNow = () => sql`
      select date, number, today, nth, "of", next, counts
      from ${released()} order by date`;

    // Caught up today: the day before yesterday's, with today's.
    await syncPuzzles([puzzle(ago(3)), puzzle(ago(2), today), puzzle(today)]);
    const outs = await sql`
      select to_char(out, 'YYYY-MM-DD') as out from puzzles order by date`;
    expect(outs).toEqual([{ out: null }, { out: today }, { out: null }]);
    expect(await releasedNow()).toEqual([
      {
        date: ago(3),
        number: 1,
        today: false,
        nth: 1,
        of: 1,
        next: null,
        counts: false,
      },
      {
        date: ago(2),
        number: 2,
        today: true,
        nth: 1,
        of: 2,
        next: today,
        counts: true,
      },
      {
        date: today,
        number: 3,
        today: true,
        nth: 2,
        of: 2,
        next: null,
        counts: true,
      },
    ]);

    // Caught up yesterday instead, and pushed 20 hours ago: both still count,
    // though today's is out.
    await syncPuzzles([
      puzzle(ago(3)),
      puzzle(ago(2), ago(1)),
      puzzle(ago(1)),
      puzzle(today),
    ]);
    const pushed = async (hours: number) => {
      for (const date of [ago(2), ago(1)])
        await sql`
          insert into announcements (date, sent_at)
          values (${date}, now() - ${`${hours} hours`}::interval)
          on conflict (date) do update set sent_at = excluded.sent_at`;
      return (await releasedNow()).map(
        (p: { date: string; today: boolean; counts: boolean }) => [
          p.date,
          p.today,
          p.counts,
        ],
      );
    };
    expect(await pushed(20)).toEqual([
      [ago(3), false, false],
      [ago(2), false, true],
      [ago(1), false, true],
      [today, true, true],
    ]);
    expect(await pushed(25)).toEqual([
      [ago(3), false, false],
      [ago(2), false, false],
      [ago(1), false, false],
      [today, true, true],
    ]);
  });
});
