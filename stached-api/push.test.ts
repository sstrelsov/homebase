import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "bun";
import QUOTES from "../src/stached/quotes.json";
import { migrate } from "./migrate";
import { announce, announceDue, notification, parseSubscription } from "./push";
import { type DayPuzzle, syncPuzzles } from "./puzzles";
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

  const twelve = { number: 12, date: "2026-10-12" };

  test("names the puzzle, then quotes the crawl", () => {
    expect(notification(twelve).title).toBe("Puzzle #12 is up");
    expect(QUOTES).toContain(notification(twelve).body);
    expect(QUOTES).toContain(notification({ ...twelve, push: null }).body);
  });

  test("says the puzzle's own line, if it has one, and its date", () => {
    expect(notification({ ...twelve, push: "Read all about it" })).toEqual({
      title: "Puzzle #12 is up",
      body: "Read all about it",
      date: "2026-10-12",
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
  const puzzle = { number: 4, date: "2026-10-02" };
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

    const saturday = { number: 5, date: "2026-10-03" };
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
});
