import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ReaderFeed = {
  id: string;
  url: string;
  title: string;
  siteUrl: string | null;
  description: string | null;
  imageUrl: string | null;
  lastFetchedAt: string | null;
  lastError: string | null;
  entryCount: number;
  unreadCount: number;
};

export type ReaderEntry = {
  id: string;
  feedId: string;
  guid: string;
  url: string | null;
  title: string;
  author: string | null;
  summary: string | null;
  content: string | null;
  publishedAt: string | null;
  isRead: boolean;
  isStarred: boolean;
  feed: {
    id: string;
    title: string;
    siteUrl: string | null;
  };
};

export type StatusFilter = "all" | "unread" | "read" | "starred";

export type ReaderEntryFilters = {
  feedId?: string | null;
  status?: string | null;
  query?: string | null;
};

export async function getReaderFeeds(): Promise<ReaderFeed[]> {
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

  return feeds.map((feed) => ({
    id: feed.id,
    url: feed.url,
    title: feed.title,
    siteUrl: feed.siteUrl,
    description: feed.description,
    imageUrl: feed.imageUrl,
    lastFetchedAt: serializeDate(feed.lastFetchedAt),
    lastError: feed.lastError,
    entryCount: feed._count.entries,
    unreadCount: unreadByFeed.get(feed.id) ?? 0
  }));
}

export async function getReaderEntries(options?: ReaderEntryFilters): Promise<ReaderEntry[]> {
  const where = buildReaderEntryWhere(options);

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

  return entries.map((entry) => ({
    id: entry.id,
    feedId: entry.feedId,
    guid: entry.guid,
    url: entry.url,
    title: entry.title,
    author: entry.author,
    summary: entry.summary,
    content: entry.content,
    publishedAt: serializeDate(entry.publishedAt),
    isRead: entry.isRead,
    isStarred: entry.isStarred,
    feed: entry.feed
  }));
}

export function buildReaderEntryWhere(options?: ReaderEntryFilters): Prisma.EntryWhereInput {
  const feedId = options?.feedId;
  const status = normalizeStatusFilter(options?.status);
  const query = options?.query?.trim();
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

  return where;
}

function normalizeStatusFilter(value: string | null | undefined): StatusFilter {
  return value === "unread" || value === "read" || value === "starred" ? value : "all";
}

function serializeDate(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}
