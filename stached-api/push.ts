// Stached's push notifications. A player turns them on from home
// (src/stached/push.ts), and each browser's subscription is kept, tied to
// that player, until its push service says it's gone (the app was deleted,
// say). There's no off switch in Stached; iOS Settings has one.
// The puzzles that come out on a day (that day's, and any missed day's
// published with it to catch up) are announced once, together, in one push:
// at 9:12am New York time, or as soon as they go live after that. Every one of
// their dates goes into announcements first and only the first claim sends,
// so no puzzle is announced twice, even across restarts.
import { sql } from "bun";
import QUOTES from "../src/stached/quotes.json";
import { numbered } from "./puzzles";
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

/**
 * Whether a push is due: on the day its puzzles come out (out), from 9:12am
 * New York time.
 */
export function announceDue(date: string, now = new Date()) {
  const time = newYorkTime(now);
  return time.startsWith(date) && time >= `${date} ${ANNOUNCE_AT}`;
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
}

/**
 * The puzzles out together, oldest first, as the title ("Puzzle #12 is up",
 * or "Puzzles #17 and #18 are up"; iOS adds "from Stached" under it, and
 * fills in an empty title with "Stached"), then the oldest one's own line, or
 * a random one of the quotes on home. Tapping it opens home, not the game, so
 * the clock waits for Play (public/stached/sw.js).
 */
export const notification = (puzzles: Announced[]) => ({
  title: pushTitle(puzzles.map((p) => p.number)),
  body: puzzles[0]?.push ?? QUOTES[Math.floor(Math.random() * QUOTES.length)],
});

/** "Puzzle #12 is up", or "Puzzles #17 and #18 are up". */
export const pushTitle = (numbers: number[]) =>
  numbers.length === 1
    ? `Puzzle ${numbered(numbers)} is up`
    : `Puzzles ${numbered(numbers)} are up`;

/**
 * Claims the push for these dates, all or none: false if any has been
 * claimed already, so no date is pushed twice.
 */
const claim = (dates: string[]) =>
  sql.begin(async (tx) => {
    const [taken] = await tx`
      select 1 from announcements where date in ${tx(dates)}`;
    if (taken) return false;
    const claimed = await tx`
      insert into announcements ${tx(dates.map((date) => ({ date })))}
      on conflict do nothing
      returning date`;
    return claimed.length === dates.length;
  });

/**
 * Announces the puzzles out on a day (oldest first) to every subscription, in
 * one push, if it's due and nobody has claimed any of their dates yet. Drops
 * the subscriptions whose push service says they're gone. Returns whether
 * this call announced them.
 */
export async function announce(
  puzzles: Announced[],
  keys: VapidKeys,
  now = new Date(),
) {
  const out = puzzles[0]?.out;
  if (!out || !announceDue(out, now)) return false;
  if (!(await claim(puzzles.map((p) => p.date)))) return false;

  const subscriptions: Subscription[] =
    await sql`select endpoint, p256dh, auth from push_subscriptions`;
  const message = JSON.stringify(notification(puzzles));
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
    `Announced ${numbered(puzzles.map((p) => p.number))}: ${count("sent")} sent, ${count("gone")} gone, ${count("failed")} failed`,
  );
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
