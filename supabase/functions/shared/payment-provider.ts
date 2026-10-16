import sdk from "npm:bakong-khqr@1.0.20";

export function createKhqr({
  receiver,
  merchantName,
  merchantCity,
  id,
  amountMinor,
  expiresAt,
}: {
  receiver: string;
  merchantName: string;
  merchantCity: string;
  id: string;
  amountMinor: number;
  expiresAt: number;
}) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0)
    throw new Error("Invalid amount");
  const info = new sdk.IndividualInfo(receiver, merchantName, merchantCity, {
    currency: sdk.khqrData.currency.usd,
    amount: amountMinor / 100,
    billNumber: id.replaceAll("-", "").slice(0, 25),
    expirationTimestamp: expiresAt,
  });
  const result = new sdk.BakongKHQR().generateIndividual(info);
  if (result.status.code !== 0 || !result.data?.qr)
    throw new Error("KHQR generation failed");
  return { qr: result.data.qr, md5: result.data.md5 };
}

export function verifiedReceiptHash(
  tx: Record<string, unknown> | null,
  receiver: string,
  amountMinor: number,
): string {
  const raw = String(tx?.amount ?? "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error("Invalid receipt amount");
  const [whole, decimal = ""] = raw.split(".");
  const received = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (
    !tx ||
    tx.toAccountId !== receiver ||
    tx.currency !== "USD" ||
    received !== amountMinor ||
    typeof tx.hash !== "string" ||
    !/^[a-fA-F0-9]{64}$/.test(tx.hash)
  )
    throw new Error("Receipt does not match checkout");
  return tx.hash.toLowerCase();
}
