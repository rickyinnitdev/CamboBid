import { supabase } from "./supabase";

export const listingService = {
  async getListings({ status, category, search, page = 1, limit = 20 } = {}) {
    let query = supabase
      .from("listings")
      .select("*, categories(name, slug), seller:profiles!listings_seller_id_fkey(display_name, avatar_url)", { count: "exact" });

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("categories.slug", category);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { listings: data, total: count };
  },

  async getListingById(id) {
    const { data, error } = await supabase
      .from("listings")
      .select("*, categories(*), seller:profiles!listings_seller_id_fkey(id, display_name, avatar_url, email, reputation_score)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async approveListing(id, approvedBy) {
    const { data, error } = await supabase
      .from("listings")
      .update({
        status: "approved",
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    // Log activity
    await supabase.from("activity_logs").insert({
      actor_id: approvedBy,
      action: "listing_approved",
      resource_type: "listing",
      resource_id: id,
      after_snapshot: { status: "approved" },
    });

    // Notify seller
    await supabase.from("notifications").insert({
      user_id: data.seller_id,
      type: "listing_approved",
      title: "Listing Approved",
      body: `Your listing "${data.title}" has been approved.`,
    });

    return data;
  },

  async rejectListing(id, rejectedBy, reason) {
    const { data, error } = await supabase
      .from("listings")
      .update({
        status: "rejected",
        rejection_reason: reason,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    await supabase.from("activity_logs").insert({
      actor_id: rejectedBy,
      action: "listing_rejected",
      resource_type: "listing",
      resource_id: id,
      after_snapshot: { status: "rejected", reason },
    });

    await supabase.from("notifications").insert({
      user_id: data.seller_id,
      type: "listing_rejected",
      title: "Listing Rejected",
      body: `Your listing "${data.title}" has been rejected. Reason: ${reason}`,
    });

    return data;
  },
};

export default listingService;
