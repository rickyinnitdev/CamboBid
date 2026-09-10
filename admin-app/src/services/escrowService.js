import { supabase } from "./supabase";

export const escrowService = {
  async getEscrowTransactions({ status, page = 1, limit = 20 } = {}) {
    let query = supabase
      .from("escrow_transactions")
      .select(`
        id, amount, status, created_at, released_at, frozen_at, refunded_at, notes,
        auctions!inner(id, end_time, listings!inner(id, title)),
        profiles!buyer_id(id, display_name, avatar_url),
        profiles!seller_id(id, display_name, avatar_url)
      `, { count: "exact" });

    if (status) query = query.eq("status", status);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { transactions: data, total: count };
  },

  async getEscrowById(id) {
    const { data, error } = await supabase
      .from("escrow_transactions")
      .select(`
        id, amount, status, created_at, released_at, frozen_at, refunded_at, notes,
        auctions!inner(id, end_time, current_price, listings!inner(id, title, images, description)),
        profiles!buyer_id(id, display_name, avatar_url, email),
        profiles!seller_id(id, display_name, avatar_url, email)
      `)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async releaseEscrow(escrowId, notes) {
    const { data, error } = await supabase.functions.invoke("escrow-release", {
      body: { escrow_id: escrowId, action: "release", notes },
    });
    if (error) throw error;
    return data;
  },

  async refundEscrow(escrowId, notes) {
    const { data, error } = await supabase.functions.invoke("escrow-release", {
      body: { escrow_id: escrowId, action: "refund", notes },
    });
    if (error) throw error;
    return data;
  },

  async freezeEscrow(escrowId, notes) {
    const { data, error } = await supabase.functions.invoke("escrow-release", {
      body: { escrow_id: escrowId, action: "freeze", notes },
    });
    if (error) throw error;
    return data;
  },

  async getEscrowStats() {
    const { data: pending } = await supabase
      .from("escrow_transactions")
      .select("id, amount", { count: "exact" })
      .eq("status", "pending");

    const { data: held } = await supabase
      .from("escrow_transactions")
      .select("id, amount", { count: "exact" })
      .eq("status", "held");

    const { data: released } = await supabase
      .from("escrow_transactions")
      .select("id, amount", { count: "exact" })
      .eq("status", "released");

    return {
      pendingCount: pending?.length || 0,
      pendingAmount: pending?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      heldCount: held?.length || 0,
      heldAmount: held?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      releasedCount: released?.length || 0,
      releasedAmount: released?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
    };
  },
};

export default escrowService;
