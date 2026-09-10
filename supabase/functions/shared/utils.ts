// ============================================================================
// Shared utilities for Edge Functions
// ============================================================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for all Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Create authenticated Supabase client from request
export function createAuthClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization")!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

// Create service role client (admin operations)
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Verify user JWT and return user
export async function verifyUser(
  supabase: SupabaseClient
): Promise<{ user: any; error?: string }> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: "Unauthorized" };
  }

  return { user };
}

// Check user role
export async function checkRole(
  adminClient: SupabaseClient,
  userId: string,
  requiredRoles: string[]
): Promise<boolean> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return profile ? requiredRoles.includes(profile.role) : false;
}

// Create CORS response
export function corsResponse(
  data: any,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Create error response
export function errorResponse(
  message: string,
  status: number = 400
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Log activity to activity_logs
export async function logActivity(
  adminClient: SupabaseClient,
  params: {
    actor_id: string | null;
    action: string;
    resource_type: string;
    resource_id?: string;
    before_snapshot?: Record<string, any>;
    after_snapshot?: Record<string, any>;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  await adminClient.from("activity_logs").insert({
    actor_id: params.actor_id,
    action: params.action,
    resource_type: params.resource_type,
    resource_id: params.resource_id || null,
    before_snapshot: params.before_snapshot || null,
    after_snapshot: params.after_snapshot || null,
    metadata: params.metadata || null,
  });
}

// Send notification
export async function sendNotification(
  adminClient: SupabaseClient,
  params: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    auction_id?: string;
  }
): Promise<void> {
  await adminClient.from("notifications").insert({
    user_id: params.user_id,
    type: params.type,
    title: params.title,
    body: params.body,
    auction_id: params.auction_id || null,
  });
}

// Broadcast to auction channel
export async function broadcastAuctionEvent(
  adminClient: SupabaseClient,
  auctionId: string,
  event: string,
  payload: Record<string, any>
): Promise<void> {
  const channel = adminClient.channel(`auction:${auctionId}`);
  await channel.send({
    type: "broadcast",
    event,
    payload,
  });
}

// Validate required fields
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): string | null {
  for (const field of fields) {
    if (!data[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// Get client IP from request
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Get user agent from request
export function getUserAgent(req: Request): string {
  return req.headers.get("user-agent") || "";
}
