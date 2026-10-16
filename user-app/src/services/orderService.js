import { supabase } from "./supabase";

async function throwFunctionError(error) {
  if (!error) return;
  try {
    const payload = await error.context?.json?.();
    throw new Error(payload?.details || payload?.error || error.message);
  } catch (readError) {
    if (readError instanceof Error && readError.message !== error.message)
      throw readError;
    throw error;
  }
}

export const orderService = {
  async getPendingWins() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("auctions")
      .select(
        "id,current_price,end_time,payment_mode,listings!inner(id,title,images)",
      )
      .eq("winner_id", user.id)
      .eq("reserve_met", true)
      .in("status", ["live", "extended"])
      .lte("end_time", new Date().toISOString())
      .order("end_time", { ascending: false });
    if (error) throw error;
    return data;
  },
  async getAuctionOrder(auctionId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("escrow_transactions")
      .select(
        "id,buyer_id,seller_id,status,amount,payment_mode,purchase_kind,funded_at",
      )
      .eq("auction_id", auctionId)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async getMyOrders() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("escrow_transactions")
      .select(
        `
        id, buyer_id, seller_id, purchase_kind, payment_mode, funded_at, amount, status, created_at, released_at,
        auctions!inner(
          id, end_time, current_price, winner_id,
          listings!inner(id, title, images, seller_id)
        ),
        buyer:public_profiles!escrow_transactions_buyer_id_fkey(id, display_name, avatar_url),
        seller:public_profiles!escrow_transactions_seller_id_fkey(id, display_name, avatar_url)
      `,
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    await throwFunctionError(error);
    return data;
  },

  async getOrderById(orderId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("escrow_transactions")
      .select(
        `
        id, auction_id, buyer_id, seller_id, buyer_id, seller_id, purchase_kind, payment_mode, funded_at, amount, status, created_at, released_at, notes, payment_mode, funded_at, purchase_kind,
        auctions!inner(
          id, end_time, current_price, winner_id, type,
          listings!inner(id, title, images, description, condition, seller_id)
        ),
        buyer:public_profiles!escrow_transactions_buyer_id_fkey(id, display_name, avatar_url),
        seller:public_profiles!escrow_transactions_seller_id_fkey(id, display_name, avatar_url)
      `,
      )
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("escrow_transactions")
      .select(
        `
        id, buyer_id, seller_id, purchase_kind, payment_mode, funded_at, amount, status, created_at, released_at,
        auctions!inner(
          id, end_time, current_price, winner_id,
          listings!inner(id, title, images)
        ),
        buyer:public_profiles!escrow_transactions_buyer_id_fkey(id, display_name, avatar_url)
      `,
      )
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};

export default orderService;
