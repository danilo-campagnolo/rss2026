import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildReaderEntryWhere, getReaderEntries } from "@/lib/reader-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entries = await getReaderEntries({
    feedId: url.searchParams.get("feedId"),
    status: url.searchParams.get("status"),
    query: url.searchParams.get("q")
  });

  return NextResponse.json({ entries });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      feedId?: string | null;
      status?: string | null;
      query?: string | null;
      isRead?: boolean;
    };

    if (body.isRead !== true) {
      return NextResponse.json({ error: "Only marking entries as read is supported." }, { status: 400 });
    }

    const where = buildReaderEntryWhere({
      feedId: body.feedId,
      status: body.status,
      query: body.query
    });

    const result = await prisma.entry.updateMany({
      where: {
        AND: [where, { isRead: false }]
      },
      data: { isRead: true }
    });

    return NextResponse.json({ count: result.count });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
