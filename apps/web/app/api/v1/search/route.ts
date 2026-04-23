import type { SearchQuery } from "@cura/contracts";
import { NextResponse } from "next/server";
import { searchFromDatabase } from "../../../../lib/search-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minRatingRaw = searchParams.get("minRating");
  const q = searchParams.get("q");
  const district = searchParams.get("district");
  const specialty = searchParams.get("specialty");
  const query: SearchQuery = {
    entityType: (searchParams.get("entityType") as SearchQuery["entityType"]) ?? "all",
    ...(q ? { q } : {}),
    ...(district ? { district } : {}),
    ...(specialty ? { specialty } : {}),
    ...(minRatingRaw ? { minRating: Number(minRatingRaw) } : {}),
  };

  try {
    const items = await searchFromDatabase(query);
    return NextResponse.json({ items, total: items.length });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "DEPENDENCY_UNAVAILABLE",
          message: "Search dependency is unavailable.",
        },
      },
      { status: 503 },
    );
  }
}
