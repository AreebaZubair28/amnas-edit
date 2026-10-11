import {
  createHash,
} from "crypto";
import {
  createClient,
} from "@supabase/supabase-js";
import {
  NextResponse,
} from "next/server";

export const runtime =
  "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    { message },
    { status }
  );
}

export async function POST(
  request: Request
) {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  const rateLimitSecret =
    process.env
      .REVIEW_RATE_LIMIT_SECRET;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !rateLimitSecret
  ) {
    console.error(
      "Review API environment variables are missing."
    );

    return jsonError(
      "Review submission is temporarily unavailable.",
      503
    );
  }

  let body: {
    product_id?: unknown;
    customer_name?: unknown;
    rating?: unknown;
    review_text?: unknown;
    website?: unknown;
  };

  try {
    body =
      await request.json();
  } catch {
    return jsonError(
      "Invalid request.",
      400
    );
  }

  /*
   * Honeypot:
   * automated form-fillers often populate every
   * field. Real customers never see this field.
   *
   * Return a normal-looking success response so
   * a simple bot does not learn that it was caught.
   */
  if (
    typeof body.website ===
      "string" &&
    body.website.trim()
  ) {
    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );
  }

  const productId =
    typeof body.product_id ===
    "string"
      ? body.product_id.trim()
      : "";

  const customerName =
    typeof body.customer_name ===
    "string"
      ? body.customer_name.trim()
      : "";

  const reviewText =
    typeof body.review_text ===
    "string"
      ? body.review_text.trim()
      : "";

  const rating =
    typeof body.rating ===
    "number"
      ? body.rating
      : Number(body.rating);

  if (
    !UUID_PATTERN.test(
      productId
    )
  ) {
    return jsonError(
      "Invalid product.",
      400
    );
  }

  if (
    customerName.length < 1 ||
    customerName.length > 80
  ) {
    return jsonError(
      "Please enter a valid name.",
      400
    );
  }

  if (
    reviewText.length < 5 ||
    reviewText.length > 1000
  ) {
    return jsonError(
      "Your review must be between 5 and 1000 characters.",
      400
    );
  }

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return jsonError(
      "Please select a rating from 1 to 5.",
      400
    );
  }

  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  const ip =
    forwardedFor
      ?.split(",")[0]
      ?.trim() ||
    request.headers.get(
      "x-real-ip"
    ) ||
    "unknown";

  const userAgent =
    request.headers.get(
      "user-agent"
    ) || "unknown";

  /*
   * We never store the raw IP address.
   * The secret-peppered hash is used only
   * for short-term abuse/rate limiting.
   */
  const fingerprint =
    createHash("sha256")
      .update(
        `${rateLimitSecret}|${ip}|${userAgent}`
      )
      .digest("hex");

  const adminClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

  const {
    data: product,
    error: productError,
  } = await adminClient
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (
    productError ||
    !product
  ) {
    return jsonError(
      "This product could not be found.",
      404
    );
  }

  const now =
    Date.now();

  const oneHourAgo =
    new Date(
      now -
        60 *
          60 *
          1000
    ).toISOString();

  const tenMinutesAgo =
    new Date(
      now -
        10 *
          60 *
          1000
    ).toISOString();

  const {
    data: recentAttempts,
    error: attemptsError,
  } = await adminClient
    .from(
      "review_submission_attempts"
    )
    .select(
      "product_id, created_at"
    )
    .eq(
      "fingerprint_hash",
      fingerprint
    )
    .gte(
      "created_at",
      oneHourAgo
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (attemptsError) {
    console.error(
      "Review rate limit check failed:",
      attemptsError
    );

    return jsonError(
      "Review submission is temporarily unavailable.",
      503
    );
  }

  if (
    (recentAttempts || [])
      .length >= 5
  ) {
    return jsonError(
      "You've submitted several reviews recently. Please try again later.",
      429
    );
  }

  const duplicateRecentProduct =
    (
      recentAttempts || []
    ).some(
      (attempt) =>
        attempt.product_id ===
          productId &&
        new Date(
          attempt.created_at
        ).getTime() >=
          new Date(
            tenMinutesAgo
          ).getTime()
    );

  if (
    duplicateRecentProduct
  ) {
    return jsonError(
      "Please wait a few minutes before submitting another review for this product.",
      429
    );
  }

  /*
   * Record the attempt before inserting the review.
   * This makes rapid repeated requests less useful
   * to simple spam scripts.
   */
  const {
    error: attemptInsertError,
  } = await adminClient
    .from(
      "review_submission_attempts"
    )
    .insert({
      fingerprint_hash:
        fingerprint,
      product_id:
        productId,
    });

  if (attemptInsertError) {
    console.error(
      "Review rate limit record failed:",
      attemptInsertError
    );

    return jsonError(
      "Review submission is temporarily unavailable.",
      503
    );
  }

  const {
    error: reviewInsertError,
  } = await adminClient
    .from("product_reviews")
    .insert({
      product_id:
        productId,
      customer_name:
        customerName,
      rating,
      review_text:
        reviewText,
      status:
        "pending",
      is_approved:
        false,
    });

  if (reviewInsertError) {
    console.error(
      "Review insert failed:",
      reviewInsertError
    );

    return jsonError(
      "Your review couldn't be submitted right now. Please try again later.",
      500
    );
  }

  /*
   * Best-effort cleanup. Failure does not block
   * a successful customer submission.
   */
  const cleanupBefore =
    new Date(
      now -
        7 *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  void adminClient
    .from(
      "review_submission_attempts"
    )
    .delete()
    .lt(
      "created_at",
      cleanupBefore
    );

  return NextResponse.json(
    { ok: true },
    { status: 201 }
  );
}
