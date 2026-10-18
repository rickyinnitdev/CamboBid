import { secureServe } from "../shared/http.ts";
import {
  checkRole,
  corsHeaders,
  corsResponse,
  createAdminClient,
  createAuthClient,
  errorResponse,
  logActivity,
  verifyUser,
} from "../shared/utils.ts";

interface AnalyzeListingRequest {
  listing_id: string;
}

function extractJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini returned no JSON object");
  return JSON.parse(match[0]);
}

function intValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function priceValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

secureServe(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return errorResponse("Missing GEMINI_API_KEY secret", 500);

    const authClient = createAuthClient(req);
    const adminClient = createAdminClient();
    const { user, error } = await verifyUser(authClient);
    if (error || !user) return errorResponse("Unauthorized", 401);

    const { listing_id }: AnalyzeListingRequest = await req.json();
    if (!listing_id) return errorResponse("Missing listing_id", 400);

    const { data: listing, error: listingError } = await adminClient
      .from("listings")
      .select(
        "id, seller_id, title, description, condition, images, starting_price, reserve_price, buy_it_now_price, categories(name, slug)",
      )
      .eq("id", listing_id)
      .single();

    if (listingError || !listing)
      return errorResponse("Listing not found", 404);

    const isStaff = await checkRole(adminClient, user.id, [
      "super_admin",
      "auctioneer",
    ]);
    if (!isStaff && listing.seller_id !== user.id)
      return errorResponse("Forbidden", 403);
    const { data: verified } = await authClient.rpc(
      isStaff ? "staff_session" : "identity_session",
    );
    if (!verified)
      return errorResponse("Verified email, policies and MFA required", 403);
    const { data: allowed, error: budgetError } = await adminClient.rpc(
      "claim_api_action",
      {
        p_user: user.id,
        p_action: "listing_analysis",
        p_limit: 20,
        p_window: 3600,
      },
    );
    if (budgetError) throw budgetError;
    if (!allowed)
      return errorResponse("Analysis limit reached. Try again later", 429);

    const prompt = `You are an expert auction catalog analyst for an online bidding marketplace.
Return ONLY valid JSON with these keys:
suggested_category_slug, estimated_low, estimated_high, authenticity_risk_score, listing_quality_score,
bidder_excitement_score, seo_title, summary, warnings.
Scores must be integers 0-100. warnings must be an array of short strings.
Analyze this listing for auction performance, trust risk, and standout positioning:
${JSON.stringify(listing)}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        redirect: "error",
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      return errorResponse("Analysis provider unavailable; retry later", 502);
    }

    const geminiJson = await geminiResponse.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const analysis = extractJson(text);

    const row = {
      listing_id,
      requested_by: user.id,
      provider: "gemini",
      model: "gemini-1.5-flash",
      suggested_category_slug: String(
        analysis.suggested_category_slug ||
          (Array.isArray(listing.categories)
            ? listing.categories[0]?.slug
            : (listing.categories as { slug?: string })?.slug) ||
          "",
      ),
      estimated_low: priceValue(analysis.estimated_low),
      estimated_high: priceValue(analysis.estimated_high),
      authenticity_risk_score: intValue(analysis.authenticity_risk_score),
      listing_quality_score: intValue(analysis.listing_quality_score),
      bidder_excitement_score: intValue(analysis.bidder_excitement_score),
      seo_title: String(analysis.seo_title || listing.title).slice(0, 180),
      summary: String(analysis.summary || "AI analysis completed.").slice(
        0,
        2000,
      ),
      warnings: Array.isArray(analysis.warnings)
        ? analysis.warnings.slice(0, 20).map((v) => String(v).slice(0, 500))
        : [],
      raw_response: geminiJson,
    };

    const { data: saved, error: saveError } = await adminClient
      .from("ai_listing_analyses")
      .insert(row)
      .select()
      .single();

    if (saveError) return errorResponse(saveError.message, 500);

    await logActivity(adminClient, {
      actor_id: user.id,
      action: "ai_listing_analyzed",
      resource_type: "listing",
      resource_id: listing_id,
      metadata: {
        provider: row.provider,
        model: row.model,
        authenticity_risk_score: row.authenticity_risk_score,
        listing_quality_score: row.listing_quality_score,
      },
    });

    return corsResponse({ analysis: saved });
  } catch (err) {
    return errorResponse("Analysis unavailable; retry later", 500);
  }
});
