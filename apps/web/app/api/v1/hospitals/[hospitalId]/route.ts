import { NextResponse } from "next/server";
import { localRepository } from "../../../../../lib/local-repository";

export async function GET(_request: Request, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  const detail = localRepository.getHospitalDetail(hospitalId);

  if (!detail) {
    return NextResponse.json({ message: "Hospital not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
