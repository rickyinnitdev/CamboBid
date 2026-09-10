import { supabase } from "./supabase";

export const notificationService = {
  async getUnreadCount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) throw error;
    return count || 0;
  },

  async subscribeToNotifications(callback) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    return supabase
      .channel(`admin-notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },

  async unsubscribeFromNotifications(channel) {
    if (channel) await supabase.removeChannel(channel);
  },
};

export default notificationService;
