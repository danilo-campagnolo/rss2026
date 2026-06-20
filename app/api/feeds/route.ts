import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/api";
import { importFeed } from "@/lib/feeds";
import { getReaderFeeds } from "@/lib/reader-data";

export async function GET() {
  const feeds = await getReaderFeeds();
  return NextResponse.json({ feeds });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const result = await importFeed(body.url ?? "");
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
