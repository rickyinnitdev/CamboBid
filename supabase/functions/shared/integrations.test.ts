import { encryptConfig, readConfig } from "./integrations.ts";
Deno.test(
  "integration secrets round-trip with provider binding and no plaintext storage",
  async () => {
    Deno.env.set("INTEGRATION_ENCRYPTION_KEY", "42".repeat(32));
    const value = { token: "temporary-test-secret", receiver: "sample@bank" };
    const ciphertext = await encryptConfig("bakong", value);
    if (ciphertext.includes(value.token))
      throw new Error("Plaintext secret was stored");
    const fake = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { ciphertext }, error: null }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof readConfig>[0];
    const decoded = await readConfig(fake, "bakong");
    if (JSON.stringify(decoded) !== JSON.stringify(value))
      throw new Error("Round trip failed");
    let rejected = false;
    try {
      await readConfig(fake, "resend");
    } catch {
      rejected = true;
    }
    if (!rejected)
      throw new Error("Ciphertext was accepted for a different integration");
    Deno.env.delete("INTEGRATION_ENCRYPTION_KEY");
  },
);
