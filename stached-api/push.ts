// Stached's push notifications. A player turns them on from home
// (src/stached/push.ts), and each browser's subscription is kept, tied to
// that player, until its push service says it's gone (the app was deleted,
// say). There's no off switch in Stached; iOS Settings has one.
// Each puzzle is announced once, on the day it comes out: at 9:12am New York
// time, or as soon as it goes live after that. The puzzles out on a day with
// no push yet (that day's, and any missed day's published with it to catch
// up) share one; one out after its day's push gets its own, right away,
// while that push still counts (a missed day's caught up just after
// midnight, with yesterday's, comes the next day). Each puzzle's date goes
// into announcements first and only the first claim sends, so none is
// announced twice, even across restarts.
import { sql } from "bun";
import QUOTES from "../src/stached/quotes.json";
import { dayName } from "./leaderboard";
import { caughtUp, LIST, numbered } from "./puzzles";
import {
  base64url,
  type Subscription,
  sendPush,
  type VapidKeys,
} from "./webpush";

/**
 * When a puzzle's push goes out on the day it comes out, New York time.
 * `make phone` sets it to midnight, so a test push goes out as soon as its
 * puzzle is live.
 */
export const ANNOUNCE_AT = process.env.ANNOUNCE_AT ?? "09:12";

const NEW_YORK = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The time in New York as "2026-10-02 09:12", which sorts as text. */
export function newYorkTime(now = new Date()) {
  const part = Object.fromEntries(
    NEW_YORK.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}`;
}

/** How long a puzzle counts after its push: a day. */
export const COUNTS_MS = 24 * 3600_000;

/** When the last of these puzzles' pushes went out, if one has. */
export const lastPush = (puzzles: { pushed?: Date | null }[]) =>
  puzzles
    .flatMap(({ pushed }) => (pushed ? [pushed] : []))
    .sort((a, b) => a.getTime() - b.getTime())
    .at(-1);

/**
 * Whether a push is due for puzzles out on a day (`out`): from 9:12am New
 * York time that day, or right away once that day has had a push (`last`,
 * the latest), while it still counts, for one out after it.
 */
export function announceDue(out: string, now = new Date(), last?: Date) {
  const time = newYorkTime(now);
  return (
    (time.startsWith(out) && time >= `${out} ${ANNOUNCE_AT}`) ||
    (last !== undefined && now.getTime() < last.getTime() + COUNTS_MS)
  );
}

/** The API's VAPID keys, from its environment. Without them, push is off. */
export function vapidKeys(): VapidKeys | null {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey } =
    process.env;
  return publicKey && privateKey ? { publicKey, privateKey } : null;
}

// The push services browsers use: Apple's, Google's (Chrome and Android),
// Mozilla's and Microsoft's (Edge). Taking any other address would let a
// player have the Studio post wherever they like.
const PUSH_HOSTS = [
  ".push.apple.com",
  ".googleapis.com",
  ".mozilla.com",
  ".notify.windows.com",
];

/** A browser's subscription, as PushSubscription.toJSON() sends it, if it's sound. */
export function parseSubscription({
  endpoint,
  keys,
}: Record<string, unknown>): Subscription | null {
  const { p256dh, auth } = (keys ?? {}) as Record<string, unknown>;
  if (
    typeof endpoint !== "string" ||
    typeof p256dh !== "string" ||
    typeof auth !== "string" ||
    !URL.canParse(endpoint)
  )
    return null;
  const url = new URL(endpoint);
  const sound =
    url.protocol === "https:" &&
    PUSH_HOSTS.some((host) => url.hostname.endsWith(host)) &&
    base64url.decode(p256dh).length === 65 &&
    base64url.decode(auth).length === 16;
  return sound ? { endpoint, p256dh, auth } : null;
}

/**
 * Keeps a browser's subscription. A browser has one, so it belongs to
 * whoever turned notifications on there last.
 */
export async function saveSubscription(
  userId: number,
  { endpoint, p256dh, auth }: Subscription,
) {
  await sql`
    insert into push_subscriptions (endpoint, user_id, p256dh, auth)
    values (${endpoint}, ${userId}, ${p256dh}, ${auth})
    on conflict (endpoint) do update set
      user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`;
}

// VAPID asks for a way to reach us: the site will do.
const SUBJECT = "https://spencerstrelsov.com";
// A phone that's off for longer than this misses the news.
const TTL = 12 * 3600;

/** A puzzle as its push announces it. */
export interface Announced {
  number: number;
  date: string;
  /** The day it comes out: its date, or a later one for a catch-up. */
  out: string;
  push?: string | null;
  /** When its push went out, if it has. */
  pushed?: Date | null;
}

/** Whose puzzles these are, by their own days: "Friday's", "Monday's and Sep 28's". */
const whose = (puzzles: Announced[]) =>
  LIST.format(puzzles.map((p) => `${dayName(p.date, p.out)}'s`));

/**
 * A push's copy, for the puzzles it announces (in number order) and the ones
 * out the same day that were announced before. The title says which are up:
 * "Puzzle #12 is up", "Puzzles #17 and #18 are up", or, when they're all
 * missed days' caught up, "Extra puzzle: #14 is up" (iOS adds "from Stached"
 * under it). A day's own is never an extra, even after an earlier push. The
 * line is the first one's own. Without one, a day's own puzzle alone gets a
 * random quote from home (null here), and any other push names each by its
 * own day, and the ones still up from before: "Monday's missed puzzle.
 * Tuesday's is still up too.", "Friday's puzzle. Wednesday's is still up
 * too." Never "today's": a missed day's is its own day's.
 */
export function pushCopy(fresh: Announced[], earlier: Announced[] = []) {
  const numbers = fresh.map((p) => p.number);
  const [s, is] = numbers.length === 1 ? ["", "is"] : ["s", "are"];
  const title = fresh.every(caughtUp)
    ? `Extra puzzle${s}: ${numbered(numbers)} ${is} up`
    : `Puzzle${s} ${numbered(numbers)} ${is} up`;
  if (fresh[0]?.push || (!fresh.some(caughtUp) && !earlier.length))
    return { title, line: fresh[0]?.push ?? null };
  const own = fresh.filter((p) => !caughtUp(p));
  const late = fresh.filter(caughtUp);
  const these = [
    own.length && `${whose(own)} puzzle`,
    late.length && `${whose(late)} missed puzzle${late.length > 1 ? "s" : ""}`,
  ].filter(Boolean) as string[];
  const still = earlier.length
    ? ` ${whose(earlier)} ${earlier.length === 1 ? "is" : "are"} still up too.`
    : "";
  return { title, line: `${LIST.format(these)}.${still}` };
}

/**
 * The push itself: its copy, with a random quote for a line it doesn't have.
 * Tapping it opens home, not the game, so the clock waits for Play
 * (public/stached/sw.js).
 */
export function notification(fresh: Announced[], earlier: Announced[] = []) {
  const { title, line } = pushCopy(fresh, earlier);
  return {
    title,
    body: line ?? QUOTES[Math.floor(Math.random() * QUOTES.length)],
  };
}

// Any number of ours: announcers take it in turn (announce).
const ANNOUNCING = 1984;

/**
 * Announces the puzzles out on a day (from `day`, in number order) that
 * haven't been, to every subscription, in one push, if it's due. Each is
 * claimed by its date first, so a puzzle announced already (earlier that
 * day, or by another process just now) is never announced again. Announcers
 * (the API's minute check, `confirm`) take turns, and read the day's puzzles
 * and their numbers only once it's theirs, so two at once can't number a
 * push differently. Drops the subscriptions whose push service says they're
 * gone. Returns whether this call sent a push.
 */
export async function announce(
  day: () => Promise<Announced[]>,
  keys: VapidKeys,
  now = new Date(),
) {
  const claim = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${ANNOUNCING})`;
    const puzzles = await day();
    const out = puzzles[0]?.out;
    if (!out || !announceDue(out, now, lastPush(puzzles))) return null;
    // Stamped with when this claim ran: the same for every puzzle in it, so
    // they keep their order by date, and later than any claim before it, so
    // a later push numbers after it. To the millisecond, as JavaScript reads
    // it, so the CLI numbers them as Postgres does.
    const claimed = new Set(
      (
        await tx`
          insert into announcements (date, sent_at)
          select value::date, date_trunc('milliseconds', statement_timestamp())
          from jsonb_array_elements_text(${puzzles.map((p) => p.date)}::jsonb)
          on conflict do nothing
          returning to_char(date, 'YYYY-MM-DD') as date`
      ).map((row: { date: string }) => row.date),
    );
    const fresh = puzzles.filter((p) => claimed.has(p.date));
    const earlier = puzzles.filter((p) => !claimed.has(p.date));
    return fresh.length ? { fresh, earlier } : null;
  });
  if (!claim) return false;
  const { fresh, earlier } = claim;

  const subscriptions: Subscription[] =
    await sql`select endpoint, p256dh, auth from push_subscriptions`;
  const push = notification(fresh, earlier);
  const message = JSON.stringify(push);
  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      const status = await sendPush(subscription, message, {
        keys,
        subject: SUBJECT,
        ttl: TTL,
      }).catch(() => 0); // unreachable
      return {
        endpoint: subscription.endpoint,
        status,
        outcome: outcome(status),
      };
    }),
  );
  const count = (kind: Outcome) =>
    results.filter((r) => r.outcome === kind).length;
  const gone = results.filter((r) => r.outcome === "gone");
  if (gone.length)
    await sql`
      delete from push_subscriptions
      where endpoint in ${sql(gone.map((r) => r.endpoint))}`;
  console.log(
    `Announced ${numbered(fresh.map((p) => p.number))}: ${count("sent")} sent, ${count("gone")} gone, ${count("failed")} failed`,
  );
  console.log(`  ${push.title} · ${push.body}`);
  for (const { endpoint, status, outcome } of results)
    if (outcome === "failed")
      console.log(`  ${new URL(endpoint).host} said ${status || "nothing"}`);
  return true;
}

type Outcome = "sent" | "gone" | "failed";

const outcome = (status: number): Outcome =>
  status >= 200 && status < 300
    ? "sent"
    : status === 404 || status === 410
      ? "gone"
      : "failed";
