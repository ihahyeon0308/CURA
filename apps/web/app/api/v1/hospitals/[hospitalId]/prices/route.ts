import { NextResponse } from "next/server";
import { localRepository } from "../../../../../../lib/local-repository";

export async function GET(request: Request, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  const { searchParams } = new URL(request.url);
  const treatment = searchParams.get("treatment") ?? "";
  const analytics = localRepository.getPriceAnalytics(hospitalId, treatment);

  if (!analytics.treatment) {
    return NextResponse.json({ message: "Treatment not found." }, { status: 404 });
  }

  return NextResponse.json(analytics);
}
