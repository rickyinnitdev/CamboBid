import { supabase } from "./supabase";
export async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
export async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const payload = await error.context.json();
      message = payload.error || message;
    } catch {
      /* Preserve transport error. */
    }
    throw new Error(message);
  }
  return data;
}
export const securityService = {
  async assurance() {
    const { data, error } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    return data.currentLevel;
  },
  status: (id) => rpc("account_security", id ? { p_user: id } : {}),
  async policies() {
    const { data, error } = await supabase
      .from("policy_documents")
      .select("*")
      .eq("current", true);
    if (error) throw error;
    return data;
  },
  accept: (terms, privacy) =>
    rpc("accept_policies", { p_terms: terms, p_privacy: privacy }),
  async factors() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data.totp || [];
  },
  async enroll() {
    const factors = await this.factors();
    for (const f of factors.filter((f) => f.status === "unverified")) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
      if (error) throw error;
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "CamboBid authenticator",
    });
    if (error) throw error;
    return data;
  },
  async verify(factorId, code) {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) throw error;
    return data;
  },
  async resend() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: {
        emailRedirectTo: window.location.origin + "/account/security",
      },
    });
    if (error) throw error;
  },
};
