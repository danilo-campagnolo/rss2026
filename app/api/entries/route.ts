import { NextResponse } from "next/server";

import { getReaderEntries } from "@/lib/reader-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entries = await getReaderEntries({
    feedId: url.searchParams.get("feedId"),
    status: url.searchParams.get("status"),
    query: url.searchParams.get("q")
  });

  return NextResponse.json({ entries });
}
