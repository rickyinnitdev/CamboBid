import { supabase } from "./supabase";

export const userService = {
  async getUsers({ role, search, suspended, page = 1, limit = 20 } = {}) {
    const { data, error } = await supabase.rpc("admin_user_directory", {
      p_search: search || "",
      p_role: role || null,
      p_page: page,
      p_limit: limit,
    });
    if (error) throw error;
    return data;
  },

  async getUserById(id) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async manage(id, action, value) {
    const { data, error } = await supabase.rpc("manage_account", {
      p_user: id,
      p_action: action,
      p_value: value || null,
    });
    if (error) throw error;
    return data;
  },
  suspendUser(id, reason) {
    return this.manage(id, "suspend", reason);
  },
  unsuspendUser(id) {
    return this.manage(id, "unsuspend");
  },
  updateUserRole(id, role) {
    return this.manage(id, "role", role);
  },
  setBidLimit(id, limit) {
    return this.manage(id, "bid_limit", String(limit));
  },
  async verifyIdentity(id, approve = true, reason = null, path = null) {
    const { data, error } = await supabase.rpc("review_identity", {
      p_user: id,
      p_approve: approve,
      p_reason: reason,
      p_path: path,
    });
    if (error) throw error;
    return data;
  },
  async security(id) {
    const { data, error } = await supabase.rpc("account_security", {
      p_user: id,
    });
    if (error) throw error;
    return data;
  },
  async history(id) {
    const results = await Promise.all([
      supabase
        .from("policy_acceptances")
        .select("*")
        .eq("user_id", id)
        .order("accepted_at", { ascending: false }),
      supabase
        .from("identity_reviews")
        .select("*")
        .eq("user_id", id)
        .order("reviewed_at", { ascending: false }),
      supabase.from("wallet_accounts").select("*").eq("user_id", id),
      supabase
        .from("wallet_ledger")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("payment_checkouts")
        .select("id,mode,status,amount_minor,created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("activity_logs")
        .select("id,action,actor_id,created_at")
        .eq("resource_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    for (const r of results) if (r.error) throw r.error;
    return {
      policies: results[0].data,
      reviews: results[1].data,
      wallets: results[2].data,
      ledger: results[3].data,
      payments: results[4].data,
      activity: results[5].data,
    };
  },
  async getBidders({ verified, suspended, page = 1, limit = 20 } = {}) {
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .in("role", ["verified_bidder", "casual_visitor"]);

    if (verified !== undefined) query = query.eq("identity_verified", verified);
    if (suspended !== undefined) query = query.eq("suspended", suspended);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { bidders: data, total: count };
  },
};

export default userService;
