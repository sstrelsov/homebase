// Web Push with nothing but WebCrypto: RFC 8291 message encryption (the
// aes128gcm coding of RFC 8188) and RFC 8292 VAPID. A push service (Apple's,
// Google's, Mozilla's) carries the message to the browser. Only the browser
// can read it, and the service checks our VAPID signature before taking it.

const encoder = new TextEncoder();

export const base64url = {
  encode: (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url"),
  decode: (text: string) => new Uint8Array(Buffer.from(text, "base64url")),
};

/** A browser's push subscription, as PushSubscription.toJSON() has it. */
export interface Subscription {
  endpoint: string;
  /** The browser's P-256 public key, uncompressed, base64url. */
  p256dh: string;
  /** Its 16-byte auth secret, base64url. */
  auth: string;
}

/** The server's VAPID key pair, base64url: the raw public point and private scalar. */
export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

// Bytes WebCrypto takes: backed by a plain ArrayBuffer.
type Bytes = Uint8Array<ArrayBuffer>;

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

async function hkdf(
  salt: Bytes,
  ikm: Bytes,
  info: string | Bytes,
  bytes: number,
) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: typeof info === "string" ? encoder.encode(info) : info,
    },
    key,
    bytes * 8,
  );
  return new Uint8Array(bits);
}

/** A P-256 key as a JWK, which is how WebCrypto takes a raw private scalar. */
export const p256Jwk = (publicKey: Uint8Array, privateKey: Uint8Array) => ({
  kty: "EC",
  crv: "P-256",
  x: base64url.encode(publicKey.subarray(1, 33)),
  y: base64url.encode(publicKey.subarray(33, 65)),
  d: base64url.encode(privateKey),
});

const RECORD_SIZE = 4096;

/**
 * Encrypts a message for one browser (RFC 8291). A fresh key pair's ECDH
 * secret with the browser's key, mixed with the browser's auth secret, keys
 * AES-128-GCM. Pass `salt` and `serverKeys` only to reproduce the RFC's test
 * vector.
 */
export async function encrypt(
  plaintext: Uint8Array,
  { p256dh, auth }: Pick<Subscription, "p256dh" | "auth">,
  {
    salt = crypto.getRandomValues(new Uint8Array(16)),
    serverKeys,
  }: { salt?: Bytes; serverKeys?: CryptoKeyPair } = {},
) {
  const ecdh = { name: "ECDH", namedCurve: "P-256" };
  const keys =
    serverKeys ?? (await crypto.subtle.generateKey(ecdh, true, ["deriveBits"]));
  const browserPublic = base64url.decode(p256dh);
  const serverPublic = new Uint8Array(
    await crypto.subtle.exportKey("raw", keys.publicKey),
  );
  const browserKey = await crypto.subtle.importKey(
    "raw",
    browserPublic,
    ecdh,
    false,
    [],
  );
  const secret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: browserKey },
      keys.privateKey,
      256,
    ),
  );
  const ikm = await hkdf(
    base64url.decode(auth),
    secret,
    concat(encoder.encode("WebPush: info\0"), browserPublic, serverPublic),
    32,
  );
  const cek = await hkdf(salt, ikm, "Content-Encoding: aes128gcm\0", 16);
  const nonce = await hkdf(salt, ikm, "Content-Encoding: nonce\0", 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  // One record, so it ends with the last-record delimiter (2) and no padding.
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aes,
    concat(plaintext, Uint8Array.of(2)),
  );
  // The header: salt, record size, and our public key as the key id.
  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = serverPublic.length;
  return concat(header, serverPublic, new Uint8Array(ciphertext));
}

/**
 * The Authorization header that proves a push is ours (RFC 8292): a JWT for
 * the push service's origin, good for 12 hours, signed with our private key.
 */
export async function vapidAuthorization(
  endpoint: string,
  { publicKey, privateKey }: VapidKeys,
  subject: string,
  now = Date.now(),
) {
  const key = await crypto.subtle.importKey(
    "jwk",
    p256Jwk(base64url.decode(publicKey), base64url.decode(privateKey)),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const part = (value: object) =>
    base64url.encode(encoder.encode(JSON.stringify(value)));
  const unsigned = `${part({ typ: "JWT", alg: "ES256" })}.${part({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + 12 * 3600,
    sub: subject,
  })}`;
  // WebCrypto signs ECDSA as raw r‖s, which is what a JWT wants.
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsigned),
  );
  return `vapid t=${unsigned}.${base64url.encode(new Uint8Array(signature))}, k=${publicKey}`;
}

/**
 * Sends one push and returns the push service's status: 201 when it took the
 * message, 404 or 410 when the subscription is gone for good.
 */
export async function sendPush(
  subscription: Subscription,
  message: string,
  { keys, subject, ttl }: { keys: VapidKeys; subject: string; ttl: number },
) {
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      authorization: await vapidAuthorization(
        subscription.endpoint,
        keys,
        subject,
      ),
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: String(ttl),
    },
    body: await encrypt(encoder.encode(message), subscription),
  });
  return res.status;
}

/** A new VAPID key pair, for the API's environment. */
export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const { d } = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
  return {
    publicKey: base64url.encode(new Uint8Array(raw)),
    privateKey: d as string,
  };
}
