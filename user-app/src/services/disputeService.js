import { supabase } from "./supabase";

export const disputeService = {
  async fileDispute({ auctionId, reason, description, evidence }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get auction to find respondent
    const { data: auction } = await supabase
      .from("auctions")
      .select("id, winner_id, listings!inner(seller_id)")
      .eq("id", auctionId)
      .single();

    if (!auction) throw new Error("Auction not found");

    const respondentId =
      user.id === auction.winner_id
        ? auction.listings.seller_id
        : auction.winner_id;

    // Upload evidence files
    const evidenceUrls = [];
    if (evidence && evidence.length > 0) {
      for (const file of evidence) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("dispute-evidence")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { signedUrl } } = await supabase.storage
          .from("dispute-evidence")
          .createSignedUrl(fileName, 86400);

        evidenceUrls.push({
          url: signedUrl,
          name: file.name,
          path: fileName,
        });
      }
    }

    // Create dispute
    const { data, error } = await supabase
      .from("disputes")
      .insert({
        auction_id: auctionId,
        filer_id: user.id,
        respondent_id: respondentId,
        reason,
        description: description || "",
        evidence: evidenceUrls,
      })
      .select()
      .single();

    if (error) throw error;

    // Freeze escrow if exists
    const { data: escrow } = await supabase
      .from("escrow_transactions")
      .select("id")
      .eq("auction_id", auctionId)
      .in("status", ["pending", "held"])
      .single();

    if (escrow) {
      await supabase.functions.invoke("escrow-release", {
        body: {
          escrow_id: escrow.id,
          action: "freeze",
          notes: `Dispute filed: ${reason}`,
        },
      });
    }

    return data;
  },

  async getMyDisputes() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("disputes")
      .select(`
        id, reason, description, status, created_at, resolved_at, appeal_deadline,
        auctions!inner(
          id, end_time, current_price,
          listings!inner(id, title, images)
        ),
        filer:profiles!disputes_filer_id_fkey(id, display_name, avatar_url),
        respondent:profiles!disputes_respondent_id_fkey(id, display_name, avatar_url)
      `)
      .or(`filer_id.eq.${user.id},respondent_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getDisputeById(disputeId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("disputes")
      .select(`
        id, reason, description, evidence, status, resolution, created_at, resolved_at, appeal_deadline,
        auctions!inner(
          id, end_time, current_price,
          listings!inner(id, title, images, description)
        ),
        filer:profiles!disputes_filer_id_fkey(id, display_name, avatar_url),
        respondent:profiles!disputes_respondent_id_fkey(id, display_name, avatar_url),
        arbitrator:profiles!disputes_arbitrator_id_fkey(id, display_name, avatar_url)
      `)
      .eq("id", disputeId)
      .single();

    if (error) throw error;

    // Ensure user is involved
    if (data.filer_id !== user.id && data.respondent_id !== user.id) {
      throw new Error("Unauthorized");
    }

    return data;
  },

  async addEvidence(disputeId, files) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get current dispute
    const { data: dispute } = await supabase
      .from("disputes")
      .select("evidence")
      .eq("id", disputeId)
      .single();

    if (!dispute) throw new Error("Dispute not found");

    // Upload new evidence
    const newEvidence = [];
    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("dispute-evidence")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { signedUrl } } = await supabase.storage
        .from("dispute-evidence")
        .createSignedUrl(fileName, 86400);

      newEvidence.push({
        url: signedUrl,
        name: file.name,
        path: fileName,
      });
    }

    // Update dispute evidence
    const { data, error } = await supabase
      .from("disputes")
      .update({
        evidence: [...(dispute.evidence || []), ...newEvidence],
      })
      .eq("id", disputeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async appealDispute(disputeId) {
    const { data, error } = await supabase
      .from("disputes")
      .update({ status: "appealed" })
      .eq("id", disputeId)
      .eq("status", "resolved")
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default disputeService;
