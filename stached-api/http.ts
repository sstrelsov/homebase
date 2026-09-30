/**
 * How the API names a request: "GET /card.png". HEAD is answered as GET, as
 * HTTP asks (Bun drops the body), so link unfurlers can check the card, and
 * monitors the health, without downloading either.
 */
export const routeOf = (req: Request) =>
  `${req.method === "HEAD" ? "GET" : req.method} ${new URL(req.url).pathname}`;
