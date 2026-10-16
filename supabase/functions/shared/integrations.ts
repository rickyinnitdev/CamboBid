import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
async function encryptionKey() {
  const raw = Deno.env.get("INTEGRATION_ENCRYPTION_KEY") || "";
  if (!/^[a-f0-9]{64}$/i.test(raw))
    throw new Error("Integration encryption is not configured");
  return crypto.subtle.importKey(
    "raw",
    new Uint8Array(raw.match(/../g)!.map((x) => parseInt(x, 16))),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptConfig(
  provider: string,
  value: Record<string, string>,
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(provider) },
    await encryptionKey(),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(cipher)));
}
export async function readConfig(
  admin: SupabaseClient,
  provider: string,
): Promise<Record<string, string>> {
  const { data, error } = await admin
    .from("integration_secrets")
    .select("ciphertext")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  if (!data) return {};
  return decryptConfig(provider, data.ciphertext);
}
export async function decryptConfig(
  provider: string,
  ciphertext: string,
): Promise<Record<string, string>> {
  const bytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: bytes.slice(0, 12),
      additionalData: new TextEncoder().encode(provider),
    },
    await encryptionKey(),
    bytes.slice(12),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}
export async function paymentConfig(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("payment_settings")
    .select("mode,live_enabled")
    .eq("id", true)
    .single();
  if (error) throw error;
  const saved = await readConfig(admin, "bakong");
  return {
    mode: data.mode,
    liveEnabled: data.live_enabled,
    receiver: saved.receiver || Deno.env.get("BAKONG_ACCOUNT_ID") || "",
    token: saved.token || Deno.env.get("BAKONG_API_TOKEN") || "",
    merchantName:
      saved.merchantName || Deno.env.get("MERCHANT_NAME") || "CamboBid",
    merchantCity:
      saved.merchantCity || Deno.env.get("MERCHANT_CITY") || "Phnom Penh",
  };
}

const escape = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function deliverDocuments(
  admin: SupabaseClient,
  userId?: string,
  documentId?: string,
) {
  const config = await readConfig(admin, "resend");
  if (!config.apiKey || !config.from) return { configured: false, accepted: 0 };
  let query = admin
    .from("document_email_queue")
    .select("id")
    .in("status", ["queued", "failed", "sending"])
    .order("created_at")
    .limit(10);
  if (userId) query = query.eq("user_id", userId);
  if (documentId) query = query.eq("document_id", documentId);
  const { data: pending, error } = await query;
  if (error) throw error;
  let accepted = 0;
  for (const item of pending || []) {
    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_document_email",
      { p_id: item.id },
    );
    if (claimError) throw claimError;
    const job = claimed?.[0];
    if (!job) continue;
    try {
      const { data: doc, error: docError } = await admin
        .from("billing_documents")
        .select("*")
        .eq("id", job.document_id)
        .single();
      if (docError) throw docError;
      const total = (Number(doc.amount_minor) / 100).toFixed(2),
        url = `https://cambobid.vercel.app/documents/${doc.id}`;
      const subject = `${doc.mode === "demo" ? "[DEMO] " : ""}CamboBid ${doc.kind} ${doc.number}`;
      const content = `${doc.number}\n${doc.snapshot.item}\nUSD ${total}\n${doc.snapshot.notice}\nView and print: ${url}`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `document-${job.id}`,
        },
        body: JSON.stringify({
          from: config.from,
          to: [job.recipient],
          subject,
          text: content,
          html: `<div style="font-family:Arial;max-width:600px;padding:32px;color:#173f44"><h2>CamboBid</h2><h1>${escape(doc.kind)} ${escape(doc.number)}</h1><p>${escape(doc.snapshot.buyer)}</p><p>${escape(doc.snapshot.item)}</p><h2>USD ${total}</h2><p>${escape(doc.snapshot.notice)}</p><p><a href="${url}">View and print your document</a></p></div>`,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(
          `Email provider returned ${response.status}; check sender/domain configuration`,
        );
      const result = await response.json();
      if (!result.id)
        throw new Error("Email provider did not return a message ID");
      const { error: updateError } = await admin
        .from("document_email_queue")
        .update({
          status: "accepted",
          provider_id: result.id,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (updateError) throw updateError;
      accepted++;
    } catch (e) {
      await admin
        .from("document_email_queue")
        .update({
          status: "failed",
          last_error:
            e instanceof Error && e.message.startsWith("Email provider")
              ? e.message
              : "Email delivery could not be confirmed; retry with the same delivery key",
        })
        .eq("id", job.id);
    }
  }
  return { configured: true, accepted };
}
