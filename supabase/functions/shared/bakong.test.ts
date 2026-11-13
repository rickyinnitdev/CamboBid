import { checkBakongTransaction, parseBakongTokens } from "./bakong.ts";

Deno.test("Bakong falls back from rejected and rate-limited tokens", async () => {
  const used: (string | null)[] = [];
  const tokens = parseBakongTokens("primary, backup\nprimary, third");
  const receipt = await checkBakongTransaction(
    "abc",
    tokens,
    async (_, init) => {
      used.push(new Headers(init?.headers).get("Authorization"));
      if (used.length === 1) return new Response(null, { status: 429 });
      if (used.length === 2) {
        return Response.json({
          responseCode: 1,
          errorCode: 1,
          responseMessage: "Token expired",
        });
      }
      return Response.json({ responseCode: 0, data: { hash: "confirmed" } });
    },
  );
  if (
    used.join(",") !== "Bearer primary,Bearer backup,Bearer third" ||
    receipt?.hash !== "confirmed"
  ) throw new Error("Failover did not verify");
});

Deno.test("a pending Bakong transaction stops token failover", async () => {
  let calls = 0;
  const receipt = await checkBakongTransaction(
    "abc",
    ["primary", "backup"],
    async () => {
      calls++;
      return Response.json({ responseCode: 1, errorCode: 1 });
    },
  );
  if (calls !== 1 || receipt !== null) throw new Error("Expected pending");
});

Deno.test("all rejected Bakong tokens report provider failure", async () => {
  try {
    await checkBakongTransaction(
      "abc",
      ["primary", "backup"],
      async () => new Response(null, { status: 401 }),
    );
  } catch {
    return;
  }
  throw new Error("Expected provider failure");
});
