import { supabase } from "./supabase";
import { rpc, invoke } from "./securityService";
export const withdrawalService = {
  async list(status) {
    let query = supabase
      .from("withdrawal_requests")
      .select(
        "*,owner:profiles!withdrawal_requests_user_id_fkey(display_name,email,suspended),reviewer:profiles!withdrawal_requests_reviewed_by_fkey(display_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  review: (id, action, reference, note) =>
    rpc("review_withdrawal", {
      p_id: id,
      p_action: action,
      p_reference: reference || null,
      p_note: note || null,
    }),
  destination: (id) => invoke("withdrawals", { action: "destination", id }),
  report: () => rpc("withdrawal_balance_report"),
  async events(id) {
    const { data, error } = await supabase
      .from("withdrawal_events")
      .select("action,note,created_at,actor_id")
      .eq("request_id", id)
      .order("created_at");
    if (error) throw error;
    return data;
  },
};
