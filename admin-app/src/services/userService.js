import { supabase } from "./supabase";

export const userService = {
  async getUsers({ role, search, suspended, page = 1, limit = 20 } = {}) {
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" });

    if (role) query = query.eq("role", role);
    if (suspended !== undefined) query = query.eq("suspended", suspended);
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { users: data, total: count };
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

  async updateUser(id, updates) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async suspendUser(id, reason) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_reason: reason,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async unsuspendUser(id) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        suspended: false,
        suspended_at: null,
        suspended_reason: null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async verifyIdentity(id) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        identity_verified: true,
        identity_verified_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setBidLimit(id, bidLimit) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ bid_limit: bidLimit })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setDepositPaid(id, paid) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ deposit_paid: paid })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateUserRole(id, role) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
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
