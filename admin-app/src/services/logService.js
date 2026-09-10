import { supabase } from "./supabase";

export const logService = {
  async getLogs({ actorId, resourceType, resourceId, action, startDate, endDate, page = 1, limit = 50 } = {}) {
    let query = supabase
      .from("activity_logs")
      .select("*, profiles!actor_id(display_name, avatar_url)", { count: "exact" });

    if (actorId) query = query.eq("actor_id", actorId);
    if (resourceType) query = query.eq("resource_type", resourceType);
    if (resourceId) query = query.eq("resource_id", resourceId);
    if (action) query = query.eq("action", action);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { logs: data, total: count };
  },

  async getLogById(id) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*, profiles!actor_id(display_name, avatar_url, email)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async getActionTypes() {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("action")
      .order("action");

    if (error) throw error;
    return [...new Set(data.map((l) => l.action))];
  },

  async getResourceTypes() {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("resource_type")
      .order("resource_type");

    if (error) throw error;
    return [...new Set(data.map((l) => l.resource_type))];
  },

  async exportToCSV({ actorId, resourceType, action, startDate, endDate } = {}) {
    let query = supabase
      .from("activity_logs")
      .select("*, profiles!actor_id(display_name, email)");

    if (actorId) query = query.eq("actor_id", actorId);
    if (resourceType) query = query.eq("resource_type", resourceType);
    if (action) query = query.eq("action", action);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    query = query.order("created_at", { ascending: false }).limit(10000);

    const { data, error } = await query;
    if (error) throw error;

    const headers = [
      "ID", "Actor", "Action", "Resource Type", "Resource ID",
      "Before Snapshot", "After Snapshot", "Metadata", "Created At"
    ];

    const rows = data.map((log) => [
      log.id,
      log.profiles?.display_name || log.actor_id,
      log.action,
      log.resource_type,
      log.resource_id || "",
      JSON.stringify(log.before_snapshot || {}),
      JSON.stringify(log.after_snapshot || {}),
      JSON.stringify(log.metadata || {}),
      log.created_at,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");

    return csv;
  },
};

export default logService;
