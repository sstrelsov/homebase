import { describe, expect, test } from "bun:test";
import {
  base64url,
  encrypt,
  generateVapidKeys,
  p256Jwk,
  vapidAuthorization,
} from "./webpush";

// RFC 8291, section 5 and appendix A.
const RFC = {
  plaintext: "When I grow up, I want to be a watermelon",
  serverPublic:
    "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  serverPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  browserPublic:
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  body:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml" +
    "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT" +
    "pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

describe("encrypt", () => {
  test("matches RFC 8291's test vector", async () => {
    const ecdh = { name: "ECDH", namedCurve: "P-256" };
    const publicKey = base64url.decode(RFC.serverPublic);
    const serverKeys = {
      publicKey: await crypto.subtle.importKey(
        "raw",
        publicKey,
        ecdh,
        true,
        [],
      ),
      privateKey: await crypto.subtle.importKey(
        "jwk",
        p256Jwk(publicKey, base64url.decode(RFC.serverPrivate)),
        ecdh,
        false,
        ["deriveBits"],
      ),
    };
    const body = await encrypt(
      new TextEncoder().encode(RFC.plaintext),
      { p256dh: RFC.browserPublic, auth: RFC.auth },
      { salt: base64url.decode(RFC.salt), serverKeys },
    );
    expect(base64url.encode(body)).toBe(RFC.body);
  });

  test("uses a fresh salt and key for every message", async () => {
    const message = new TextEncoder().encode("Puzzle #12 is up");
    const browser = { p256dh: RFC.browserPublic, auth: RFC.auth };
    const [a, b] = await Promise.all([
      encrypt(message, browser),
      encrypt(message, browser),
    ]);
    expect(a.subarray(0, 16)).not.toEqual(b.subarray(0, 16));
    expect(a.subarray(21, 86)).not.toEqual(b.subarray(21, 86));
  });
});

describe("VAPID", () => {
  const endpoint = "https://web.push.apple.com/QGuQyavXutnMH1Ocg";
  const subject = "https://spencerstrelsov.com";
  const now = Date.UTC(2026, 9, 2, 13, 12);

  test("signs a JWT for the push service that our public key verifies", async () => {
    const keys = await generateVapidKeys();
    const header = await vapidAuthorization(endpoint, keys, subject, now);
    const [, token, k] = header.match(/^vapid t=(\S+), k=(\S+)$/) ?? [];
    expect(k).toBe(keys.publicKey);

    const [head, claims, signature] = token.split(".");
    const decode = (part: string) =>
      JSON.parse(new TextDecoder().decode(base64url.decode(part)));
    expect(decode(head)).toEqual({ typ: "JWT", alg: "ES256" });
    expect(decode(claims)).toEqual({
      aud: "https://web.push.apple.com",
      exp: now / 1000 + 12 * 3600,
      sub: subject,
    });

    const publicKey = await crypto.subtle.importKey(
      "raw",
      base64url.decode(k),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const verify = (data: string) =>
      crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        base64url.decode(signature),
        new TextEncoder().encode(data),
      );
    expect(await verify(`${head}.${claims}`)).toBe(true);
    expect(await verify(`${head}.${claims}x`)).toBe(false);
  });

  test("makes keys in the sizes push services expect", async () => {
    const { publicKey, privateKey } = await generateVapidKeys();
    expect(base64url.decode(publicKey)).toHaveLength(65);
    expect(base64url.decode(publicKey)[0]).toBe(4);
    expect(base64url.decode(privateKey)).toHaveLength(32);
  });
});
