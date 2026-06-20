import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/api";
import { importFeed } from "@/lib/feeds";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const feeds = await prisma.feed.findMany({
    include: {
      _count: {
        select: {
          entries: true
        }
      }
    },
    orderBy: { title: "asc" }
  });

  const unreadCounts = await prisma.entry.groupBy({
    by: ["feedId"],
    where: { isRead: false },
    _count: true
  });

  const unreadByFeed = new Map(unreadCounts.map((item) => [item.feedId, item._count]));

  return NextResponse.json({
    feeds: feeds.map((feed) => ({
      ...feed,
      entryCount: feed._count.entries,
      unreadCount: unreadByFeed.get(feed.id) ?? 0
    }))
  });
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
