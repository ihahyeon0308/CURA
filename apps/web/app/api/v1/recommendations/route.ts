import type { RecommendationMode, RecommendationQuery } from "@cura/contracts";
import { NextResponse } from "next/server";
import { localRepository } from "../../../../lib/local-repository";

const validModes: RecommendationMode[] = ["balanced", "value", "quality"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const specialty = searchParams.get("specialty");

  if (!specialty) {
    return NextResponse.json({ message: "specialty is required." }, { status: 400 });
  }

  const modeRaw = searchParams.get("mode");
  const mode: RecommendationMode = validModes.includes(modeRaw as RecommendationMode)
    ? (modeRaw as RecommendationMode)
    : "balanced";
  const treatment = searchParams.get("treatment");
  const district = searchParams.get("district");
  const query: RecommendationQuery = {
    specialty,
    mode,
    ...(treatment ? { treatment } : {}),
    ...(district ? { district } : {}),
  };

  const items = localRepository.getRecommendations(query);
  return NextResponse.json({ items, total: items.length });
}
