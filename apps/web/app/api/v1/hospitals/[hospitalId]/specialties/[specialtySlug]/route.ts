import { NextResponse } from "next/server";
import { localRepository } from "../../../../../../../lib/local-repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hospitalId: string; specialtySlug: string }> },
) {
  const { hospitalId, specialtySlug } = await context.params;
  const detail = localRepository.getHospitalSpecialtyDetail(hospitalId, specialtySlug);

  if (!detail) {
    return NextResponse.json({ message: "Hospital specialty not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
