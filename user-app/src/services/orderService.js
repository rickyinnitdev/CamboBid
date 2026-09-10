import { supabase } from "./supabase";

export const orderService = {
  async getMyOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("escrow_transactions")
      .select(`
        id, amount, status, created_at, released_at,
        auctions!inner(
          id, end_time, current_price, winner_id,
          listings!inner(id, title, images, seller_id)
        ),
        profiles!buyer_id(id, display_name, avatar_url),
        profiles!seller_id(id, display_name, avatar_url)
      `)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getOrderById(orderId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("escrow_transactions")
      .select(`
        id, auction_id, buyer_id, seller_id, amount, status, created_at, released_at, notes,
        auctions!inner(
          id, end_time, current_price, winner_id, type,
          listings!inner(id, title, images, description, condition, seller_id)
        ),
        profiles!buyer_id(id, display_name, avatar_url, email),
        profiles!seller_id(id, display_name, avatar_url, email)
      `)
      .eq("id", orderId)
      .single();

    if (error) throw error;

    // Ensure user is buyer or seller
    if (data.buyer_id !== user.id && data.seller_id !== user.id) {
      throw new Error("Unauthorized");
    }

    return data;
  },

  async confirmDelivery(orderId) {
    const { data, error } = await supabase.functions.invoke("escrow-release", {
      body: {
        escrow_id: orderId,
        action: "release",
        notes: "Buyer confirmed delivery",
      },
    });

    if (error) throw error;
    return data;
  },

  async getAsSellerOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("escrow_transactions")
      .select(`
        id, amount, status, created_at, released_at,
        auctions!inner(
          id, end_time, current_price, winner_id,
          listings!inner(id, title, images)
        ),
        profiles!buyer_id(id, display_name, avatar_url)
      `)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};

export default orderService;
