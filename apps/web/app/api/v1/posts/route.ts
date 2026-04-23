import { NextResponse } from "next/server";
import { localRepository } from "../../../../lib/local-repository";

export async function GET() {
  const items = localRepository.getCommunityPosts();
  return NextResponse.json({ items });
}
