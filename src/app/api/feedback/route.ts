import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { describeAnonKeySource, getSupabaseUrl } from "@/lib/supabase-env";
import type { GuestFeedbackInput, RecommendChoice } from "@/lib/types";

function isRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isRecommend(value: unknown): value is RecommendChoice {
  return value === "yes" || value === "maybe" || value === "no";
}

export async function POST(request: Request) {
  let body: Partial<GuestFeedbackInput>;
  try {
    body = (await request.json()) as Partial<GuestFeedbackInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const guest_name = typeof body.guest_name === "string" ? body.guest_name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!guest_name || guest_name.length > 120) {
    return NextResponse.json({ error: "Name is required (max 120 chars)" }, { status: 400 });
  }
  if (!phone || phone.length > 40) {
    return NextResponse.json({ error: "Phone is required (max 40 chars)" }, { status: 400 });
  }
  if (
    !isRating(body.overall_stay) ||
    !isRating(body.check_in) ||
    !isRating(body.room_cleanliness) ||
    !isRating(body.food_drink)
  ) {
    return NextResponse.json({ error: "Ratings must be integers 1–5" }, { status: 400 });
  }
  if (body.spa_fitness !== null && body.spa_fitness !== undefined && !isRating(body.spa_fitness)) {
    return NextResponse.json(
      { error: "Spa/fitness must be 1–5 or null (N/A)" },
      { status: 400 },
    );
  }
  if (!isRecommend(body.recommend)) {
    return NextResponse.json({ error: "Recommend must be yes, maybe, or no" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAnonClient();
    const { error } = await supabase.from("guest_feedback").insert({
      guest_name,
      phone,
      overall_stay: body.overall_stay,
      check_in: body.check_in,
      room_cleanliness: body.room_cleanliness,
      food_drink: body.food_drink,
      spa_fitness: body.spa_fitness ?? null,
      recommend: body.recommend,
    });

    if (error) {
      console.error("guest_feedback insert failed", error);
      const detail = [error.message, error.code && `code=${error.code}`, error.hint]
        .filter(Boolean)
        .join(" · ");
      return NextResponse.json(
        {
          error: `Could not save feedback: ${detail}`,
          debug: {
            urlHost: (() => {
              try {
                return new URL(getSupabaseUrl() ?? "").host;
              } catch {
                return null;
              }
            })(),
            anonKeyEnv: describeAnonKeySource(),
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      {
        error: message,
        debug: {
          urlHost: (() => {
            try {
              return new URL(getSupabaseUrl() ?? "").host;
            } catch {
              return null;
            }
          })(),
          anonKeyEnv: describeAnonKeySource(),
        },
      },
      { status: 500 },
    );
  }
}
