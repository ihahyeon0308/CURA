import { NextResponse } from "next/server";
import { localRepository } from "../../../../../lib/local-repository";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const detail = localRepository.getTreatmentDetail(slug);

  if (!detail) {
    return NextResponse.json({ message: "Treatment not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
