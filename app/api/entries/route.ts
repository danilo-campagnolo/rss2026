import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const feedId = url.searchParams.get("feedId");
  const status = url.searchParams.get("status") ?? "all";
  const query = url.searchParams.get("q")?.trim();

  const where: Prisma.EntryWhereInput = {};

  if (feedId && feedId !== "all") {
    where.feedId = feedId;
  }

  if (status === "unread") {
    where.isRead = false;
  }

  if (status === "read") {
    where.isRead = true;
  }

  if (status === "starred") {
    where.isStarred = true;
  }

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { summary: { contains: query } },
      { content: { contains: query } }
    ];
  }

  const entries = await prisma.entry.findMany({
    where,
    include: {
      feed: {
        select: {
          id: true,
          title: true,
          siteUrl: true
        }
      }
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 200
  });

  return NextResponse.json({ entries });
}
