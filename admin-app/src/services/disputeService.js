import { supabase } from "./supabase";

export const disputeService = {
  async getDisputes({ status, page = 1, limit = 20 } = {}) {
    let query = supabase
      .from("disputes")
      .select(`
        id, reason, description, status, created_at, resolved_at, appeal_deadline,
        auctions!inner(id, end_time, listings!inner(id, title, images)),
        filer:profiles!disputes_filer_id_fkey(id, display_name, avatar_url),
        respondent:profiles!disputes_respondent_id_fkey(id, display_name, avatar_url),
        arbitrator:profiles!disputes_arbitrator_id_fkey(id, display_name, avatar_url)
      `, { count: "exact" });

    if (status) query = query.eq("status", status);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { disputes: data, total: count };
  },

  async getDisputeById(id) {
    const { data, error } = await supabase
      .from("disputes")
      .select(`
        id, reason, description, evidence, status, resolution, created_at, resolved_at, appeal_deadline,
        auctions!inner(id, end_time, current_price, listings!inner(id, title, images, description)),
        filer:profiles!disputes_filer_id_fkey(id, display_name, avatar_url, email),
        respondent:profiles!disputes_respondent_id_fkey(id, display_name, avatar_url, email),
        arbitrator:profiles!disputes_arbitrator_id_fkey(id, display_name, avatar_url, email)
      `)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async assignArbitrator(disputeId, arbitratorId) {
    const { data, error } = await supabase
      .from("disputes")
      .update({
        arbitrator_id: arbitratorId,
        status: "under_review",
      })
      .eq("id", disputeId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from("activity_logs").insert({
      actor_id: arbitratorId,
      action: "dispute_assigned",
      resource_type: "dispute",
      resource_id: disputeId,
    });

    return data;
  },

  async resolveDispute(disputeId, resolution, resolvedBy) {
    const { data, error } = await supabase
      .from("disputes")
      .update({
        status: "resolved",
        resolution,
        resolved_at: new Date().toISOString(),
        appeal_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", disputeId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from("activity_logs").insert({
      actor_id: resolvedBy,
      action: "dispute_resolved",
      resource_type: "dispute",
      resource_id: disputeId,
      after_snapshot: { status: "resolved", resolution },
    });

    return data;
  },

  async updateDisputeStatus(disputeId, status) {
    const { data, error } = await supabase
      .from("disputes")
      .update({ status })
      .eq("id", disputeId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

export default disputeService;
