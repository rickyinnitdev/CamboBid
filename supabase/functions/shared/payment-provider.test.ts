import { createKhqr, verifiedReceiptHash } from "./payment-provider.ts";
import sdk from "npm:bakong-khqr@1.0.20";
const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};
Deno.test(
  "dynamic KHQR contains the server amount and passes SDK integrity verification",
  () => {
    const result = createKhqr({
      receiver: "demo@abak",
      merchantName: "CamboBid",
      merchantCity: "Phnom Penh",
      id: crypto.randomUUID(),
      amountMinor: 1250,
      expiresAt: Date.now() + 300000,
    });
    assert(Boolean(result.qr) && Boolean(result.md5), "Missing KHQR data");
    assert(sdk.BakongKHQR.verify(result.qr).isValid, "Invalid QR integrity");
    const decoded = sdk.BakongKHQR.decode(result.qr);
    assert(
      decoded.data.transactionAmount === "12.5" ||
        decoded.data.transactionAmount === "12.50",
      "Amount was not encoded",
    );
  },
);
Deno.test("receipt accepts exact decimal amounts and normalizes hashes", () => {
  const hash = "A".repeat(64);
  assert(
    verifiedReceiptHash(
      { amount: "12.50", currency: "USD", toAccountId: "demo@abak", hash },
      "demo@abak",
      1250,
    ) === hash.toLowerCase(),
    "Hash mismatch",
  );
});
Deno.test(
  "receipt rejects receiver, currency, amount, malformed hash and fractional-cent mismatches",
  () => {
    const good = {
      amount: "12.50",
      currency: "USD",
      toAccountId: "demo@abak",
      hash: "a".repeat(64),
    };
    for (const patch of [
      { amount: "12.49" },
      { amount: "12.501" },
      { amount: "1e1" },
      { amount: null },
      { currency: "KHR" },
      { toAccountId: "attacker@bank" },
      { hash: "invalid" },
    ]) {
      let rejected = false;
      try {
        verifiedReceiptHash({ ...good, ...patch }, "demo@abak", 1250);
      } catch {
        rejected = true;
      }
      assert(rejected, "Accepted mismatched receipt " + JSON.stringify(patch));
    }
  },
);
