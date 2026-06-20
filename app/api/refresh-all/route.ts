import { NextResponse } from "next/server";

import { refreshAllFeeds } from "@/lib/feeds";

export async function POST() {
  const result = await refreshAllFeeds();
  return NextResponse.json(result, { status: result.errors.length > 0 ? 207 : 200 });
}
