import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/api";
import { refreshFeed } from "@/lib/feeds";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await refreshFeed(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
