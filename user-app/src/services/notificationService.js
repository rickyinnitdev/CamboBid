import { supabase } from "./supabase";

export const notificationService = {
  async getNotifications({ unreadOnly = false, page = 1, limit = 20 } = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    let query = supabase
      .from("notifications")
      .select("*, auctions(id, listings(id, title))", { count: "exact" })
      .eq("user_id", user.id);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { notifications: data, total: count };
  },

  async getUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) throw error;
    return count || 0;
  },

  async markAsRead(notificationId) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) throw error;
  },

  async deleteNotification(notificationId) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
  },

  async subscribeToNotifications(callback) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return channel;
  },

  async unsubscribeFromNotifications(channel) {
    if (channel) {
      await supabase.removeChannel(channel);
    }
  },
};

export default notificationService;
