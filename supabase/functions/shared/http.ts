const productionOrigins = [
  "https://cambobid.vercel.app",
  "https://cambobidadmin.vercel.app",
];
const localOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
];
export const MAX_JSON_BYTES = 64 * 1024;
export function allowedOrigin(origin: string | null) {
  if (!origin) return null; // Native/CLI clients still need a valid bearer token.
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const defaults = (Deno.env.get("SUPABASE_URL") || "").startsWith("http://")
    ? [...productionOrigins, ...localOrigins]
    : productionOrigins;
  return [...defaults, ...configured].includes(origin) ? origin : null;
}
export function secureHandler(
  handler: (req: Request) => Response | Promise<Response>,
) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin"),
      allowed = allowedOrigin(origin);
    const finish = (response: Response) => {
      const headers = new Headers(response.headers);
      headers.delete("Access-Control-Allow-Origin");
      headers.delete("Access-Control-Allow-Credentials");
      if (allowed) headers.set("Access-Control-Allow-Origin", allowed);
      headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      headers.set(
        "Access-Control-Allow-Headers",
        "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
      );
      headers.set("Vary", "Origin");
      headers.set("Cache-Control", "no-store");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(response.body, { status: response.status, headers });
    };
    const fail = (error: string, status: number) =>
      finish(
        new Response(JSON.stringify({ error }), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      );
    if (origin && !allowed) return fail("Origin is not allowed", 403);
    if (req.method === "OPTIONS")
      return finish(new Response(null, { status: 204 }));
    if (req.method !== "POST") return fail("Method not allowed", 405);
    if (!/^Bearer\s+\S+$/i.test(req.headers.get("authorization") || ""))
      return fail("Authentication required", 401);
    if (
      req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "application/json"
    )
      return fail("Use application/json", 415);
    if (Number(req.headers.get("content-length") || 0) > MAX_JSON_BYTES)
      return fail("Request body is too large", 413);
    try {
      const reader = req.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      const deadline = Date.now() + 5000;
      if (reader) {
        while (true) {
          let timeout: ReturnType<typeof setTimeout> | undefined;
          const result = await Promise.race([
            reader.read(),
            new Promise<null>((resolve) => {
              timeout = setTimeout(
                () => resolve(null),
                Math.max(1, deadline - Date.now()),
              );
            }),
          ]).finally(() => clearTimeout(timeout));
          if (!result) {
            void reader.cancel().catch(() => {});
            return fail("Request body timed out", 408);
          }
          const { done, value } = result;
          if (done) break;
          length += value.byteLength;
          if (length > MAX_JSON_BYTES) {
            await reader.cancel();
            return fail("Request body is too large", 413);
          }
          chunks.push(value);
        }
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      let value;
      try {
        value = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return fail("Malformed JSON", 400);
      }
      if (!value || Array.isArray(value) || typeof value !== "object")
        return fail("JSON object required", 400);
      return finish(await handler(new Request(req, { body: bytes })));
    } catch {
      return fail("Request could not be processed", 500);
    }
  };
}
export function secureServe(
  handler: (req: Request) => Response | Promise<Response>,
) {
  Deno.serve(secureHandler(handler));
}
