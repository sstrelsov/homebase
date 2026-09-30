import { expect, test } from "bun:test";
import { routeOf } from "./http";

const request = (method: string, path: string) =>
  new Request(`http://localhost${path}`, { method });

test("HEAD is answered like GET", () => {
  expect(routeOf(request("HEAD", "/card.png"))).toBe("GET /card.png");
  expect(routeOf(request("HEAD", "/health"))).toBe("GET /health");
});

test("everything else keeps its method, and the query doesn't count", () => {
  expect(routeOf(request("GET", "/card.png?1"))).toBe("GET /card.png");
  expect(routeOf(request("POST", "/guess"))).toBe("POST /guess");
  expect(routeOf(request("OPTIONS", "/login"))).toBe("OPTIONS /login");
});
