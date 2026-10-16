import { supabase } from "./supabase";
import { rpc, invoke } from "./securityService";
export const withdrawalService = {
  async list() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in first");
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },
  create: (id, mode, amountMinor, destination) =>
    invoke("withdrawals", {
      action: "create",
      id,
      mode,
      amount_minor: amountMinor,
      destination,
    }),
  cancel: (id) => rpc("cancel_withdrawal", { p_id: id }),
  async events(id) {
    const { data, error } = await supabase
      .from("withdrawal_events")
      .select("action,note,created_at")
      .eq("request_id", id)
      .order("created_at");
    if (error) throw error;
    return data;
  },
};
