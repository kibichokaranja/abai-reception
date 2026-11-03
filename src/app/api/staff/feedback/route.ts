import { NextResponse } from "next/server";
import { isStaffAuthenticated } from "@/lib/staff-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const lowOnly = searchParams.get("low") === "1";

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("guest_feedback")
      .select(
        "id, guest_name, phone, overall_stay, check_in, room_cleanliness, food_drink, spa_fitness, recommend, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (from) {
      query = query.gte("created_at", `${from}T00:00:00.000Z`);
    }
    if (to) {
      query = query.lte("created_at", `${to}T23:59:59.999Z`);
    }
    if (lowOnly) {
      query = query.or(
        "overall_stay.lte.2,check_in.lte.2,room_cleanliness.lte.2,food_drink.lte.2,spa_fitness.lte.2",
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("staff feedback select failed", error);
      return NextResponse.json(
        { error: "Could not load feedback from Supabase." },
        { status: 500 },
      );
    }

    return NextResponse.json({ feedback: data ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          "Server is missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL).",
      },
      { status: 500 },
    );
  }
}
