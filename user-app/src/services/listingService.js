import { supabase } from "./supabase";

export const listingService = {
  async getListings({ status, category, search, sort, page = 1, limit = 12 } = {}) {
    let query = supabase
      .from("listings")
      .select("*, categories(name, slug), profiles(display_name, avatar_url)", { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.in("status", ["approved", "live", "sold"]);
    }

    if (category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .single();

      if (cat) {
        query = query.eq("category_id", cat.id);
      }
    }

    if (search) {
      query = query.textSearch("title", search, { type: "websearch" });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    switch (sort) {
      case "price_asc":
        query = query.order("starting_price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("starting_price", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { listings: data, total: count, page, limit };
  },

  async getListingById(id) {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        *,
        categories(id, name, slug),
        profiles(id, display_name, avatar_url, reputation_score)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async getSellerListings(sellerId) {
    const { data, error } = await supabase
      .from("listings")
      .select("*, categories(name, slug)")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createListing(listing) {
    const { data, error } = await supabase
      .from("listings")
      .insert(listing)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateListing(id, updates) {
    const { data, error } = await supabase
      .from("listings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteListing(id) {
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async uploadImages(listingId, files) {
    const uploadedImages = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("listing-images")
        .getPublicUrl(fileName);

      uploadedImages.push({
        url: publicUrl,
        name: file.name,
        path: fileName,
      });
    }

    return uploadedImages;
  },

  async removeImage(listingId, imagePath) {
    const { error } = await supabase.storage
      .from("listing-images")
      .remove([imagePath]);

    if (error) throw error;
  },

  async incrementViewCount(listingId) {
    const { data: listing } = await supabase
      .from("listings")
      .select("view_count")
      .eq("id", listingId)
      .single();

    if (listing) {
      await supabase
        .from("listings")
        .update({ view_count: listing.view_count + 1 })
        .eq("id", listingId);
    }
  },

  async getFeaturedListings(limit = 6) {
    const { data, error } = await supabase
      .from("listings")
      .select("*, categories(name, slug), profiles(display_name, avatar_url)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },
};

export default listingService;
