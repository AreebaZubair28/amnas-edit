import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_EVENTS = new Set([
  "product_view",
  "whatsapp_click",
  "instagram_click",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rateLimitSecret = process.env.REVIEW_RATE_LIMIT_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !rateLimitSecret) {
    console.error("Analytics API environment variables are missing.");
    return jsonError("Analytics is temporarily unavailable.", 503);
  }

  let body: {
    product_id?: unknown;
    event_type?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const productId =
    typeof body.product_id === "string" ? body.product_id.trim() : "";

  const eventType =
    typeof body.event_type === "string" ? body.event_type.trim() : "";

  if (!UUID_PATTERN.test(productId)) {
    return jsonError("Invalid product.", 400);
  }

  if (!ALLOWED_EVENTS.has(eventType)) {
    return jsonError("Invalid analytics event.", 400);
  }

  const forwardedFor = request.headers.get("x-forwarded-for");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  // The raw IP is never stored. Only this secret-peppered hash
  // is sent to the database for short-term duplicate/rate-limit checks.
  const fingerprint = createHash("sha256")
    .update(`${rateLimitSecret}|analytics|${ip}|${userAgent}`)
    .digest("hex");

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  /*
   * IMPORTANT:
   * Deduplication and event insertion happen together inside ONE
   * PostgreSQL function/transaction.
   *
   * This prevents the race condition where React development mode
   * can send two near-simultaneous requests and both requests see
   * "no previous event" before either one inserts.
   */
  const { data, error } = await adminClient.rpc(
    "record_analytics_event_secure",
    {
      p_product_id: productId,
      p_event_type: eventType,
      p_fingerprint_hash: fingerprint,
    }
  );

  if (error) {
    console.error("Analytics RPC failed:", error);
    return jsonError("Analytics is temporarily unavailable.", 503);
  }

  const result = typeof data === "string" ? data : "error";

  if (result === "not_found") {
    return jsonError("Product not found.", 404);
  }

  if (result === "rate_limited") {
    // Analytics must never interrupt the customer's browsing/inquiry flow.
    return NextResponse.json(
      { ok: true, recorded: false, reason: "rate_limited" },
      { status: 200 }
    );
  }

  if (result === "duplicate") {
    return NextResponse.json(
      { ok: true, recorded: false, reason: "duplicate" },
      { status: 200 }
    );
  }

  if (result !== "recorded") {
    console.error("Unexpected analytics RPC result:", result);
    return jsonError("Analytics is temporarily unavailable.", 503);
  }

  return NextResponse.json(
    { ok: true, recorded: true },
    { status: 201 }
  );
}
