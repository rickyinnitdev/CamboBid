import { secureHandler, MAX_JSON_BYTES } from "./http.ts";
const request = (
  origin: string | null,
  body = "{}",
  extra: Record<string, string> = {},
) =>
  new Request("https://example.test/payments", {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
      ...extra,
    },
    body,
  });
const assert = (v: unknown, m: string) => {
  if (!v) throw new Error(m);
};
Deno.test(
  "CORS permits exact configured origins and never reflects hostile origins",
  async () => {
    const handler = secureHandler(() => new Response('{"ok":true}'));
    const good = await handler(request("https://cambobid.vercel.app"));
    assert(good.status === 200, "allowed request failed");
    assert(
      good.headers.get("Access-Control-Allow-Origin") ===
        "https://cambobid.vercel.app",
      "origin missing",
    );
    for (const origin of [
      "https://attacker.test",
      "https://cambobid.vercel.app.attacker.test",
      "null",
    ]) {
      const r = await handler(request(origin));
      assert(r.status === 403, "hostile origin permitted");
      assert(
        !r.headers.has("Access-Control-Allow-Origin"),
        "hostile origin exposed",
      );
    }
    assert(
      (await handler(request(null))).status === 200,
      "native client incorrectly denied",
    );
  },
);
Deno.test(
  "body boundary rejects non-JSON, arrays and oversized declared or streamed requests",
  async () => {
    let reached = 0;
    const handler = secureHandler(() => {
      reached++;
      return new Response("ok");
    });
    assert(
      (await handler(request(null, "{}", { "content-type": "text/plain" })))
        .status === 415,
      "text/plain accepted",
    );
    assert(
      (await handler(request(null, "[]"))).status === 400,
      "array accepted",
    );
    assert(
      (await handler(request(null, "{"))).status === 400,
      "malformed JSON accepted",
    );
    assert(
      (
        await handler(
          request(null, "{}", { "content-length": String(MAX_JSON_BYTES + 1) }),
        )
      ).status === 413,
      "large declared body accepted",
    );
    assert(
      (
        await handler(
          request(null, JSON.stringify({ v: "x".repeat(MAX_JSON_BYTES) })),
        )
      ).status === 413,
      "stream limit bypassed",
    );
    assert(reached === 0, "invalid request reached handler");
  },
);
Deno.test(
  "preflight is unauthenticated but mutation requires bearer auth and no caching",
  async () => {
    const handler = secureHandler(() => new Response("ok"));
    const preflight = await handler(
      new Request("https://example.test", {
        method: "OPTIONS",
        headers: { origin: "https://cambobidadmin.vercel.app" },
      }),
    );
    assert(preflight.status === 204, "preflight failed");
    assert(
      (
        await handler(
          new Request("https://example.test", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
          }),
        )
      ).status === 401,
      "missing bearer permitted",
    );
    const r = await handler(request(null));
    assert(
      r.headers.get("Cache-Control") === "no-store",
      "sensitive response cached",
    );
    assert(
      r.headers.get("X-Content-Type-Options") === "nosniff",
      "nosniff missing",
    );
    assert(r.headers.get("Vary") === "Origin", "origin cache mixing");
  },
);

Deno.test("stalled body reads are bounded", async () => {
  const handler = secureHandler(() => new Response("unexpected"));
  const body = new ReadableStream<Uint8Array>({ start() {} });
  const r = await handler(
    new Request("https://example.test", {
      method: "POST",
      headers: {
        authorization: "Bearer test",
        "content-type": "application/json",
      },
      body,
    }),
  );
  assert(r.status === 408, "stalled body kept the handler occupied");
});
