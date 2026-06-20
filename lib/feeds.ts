import Parser from "rss-parser";
import sanitizeHtml from "sanitize-html";

import { prisma } from "@/lib/prisma";

type ParserFeed = Awaited<ReturnType<Parser["parseURL"]>>;
type ParserItem = ParserFeed["items"][number] & {
  "content:encoded"?: string;
  creator?: string;
};

type XmlFieldObject = {
  _?: unknown;
  "#text"?: unknown;
  text?: unknown;
};

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "rss-feed-engine/0.1 (+https://github.com/open-source/rss-feed-engine)"
  }
});

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption"]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    figure: ["class"],
    figcaption: ["class"]
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    img: sanitizeHtml.simpleTransform("img", { loading: "lazy" })
  }
};

export type FeedRefreshResult = {
  feedId: string;
  imported: number;
  updated: number;
};

export function normalizeFeedUrl(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Feed URL is required.");
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new Error("Feed URL must use HTTP or HTTPS.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Feed URL must use HTTP or HTTPS.");
  }

  parsed.hash = "";
  return parsed.toString();
}

export function stringFromFeedValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const joined = value.map(stringFromFeedValue).filter(Boolean).join(" ").trim();
    return joined.length > 0 ? joined : null;
  }

  if (value && typeof value === "object") {
    const objectValue = value as XmlFieldObject;
    return (
      stringFromFeedValue(objectValue._) ??
      stringFromFeedValue(objectValue["#text"]) ??
      stringFromFeedValue(objectValue.text)
    );
  }

  return null;
}

export function cleanHtml(value?: unknown): string | null {
  const html = stringFromFeedValue(value);

  if (!html) {
    return null;
  }

  const cleaned = sanitizeHtml(html, sanitizeOptions).trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function textFromHtml(value?: unknown): string | null {
  const cleaned = sanitizeHtml(stringFromFeedValue(value) ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

export function deriveEntryGuid(item: Partial<ParserItem>): string {
  const candidates = [item.guid, item.id, item.link].map((value) => stringFromFeedValue(value) ?? "");
  const existing = candidates.find(Boolean);

  if (existing) {
    return existing;
  }

  const title = stringFromFeedValue(item.title) ?? "untitled";
  const date = stringFromFeedValue(item.isoDate) ?? stringFromFeedValue(item.pubDate) ?? "";
  return `${title}:${date}`;
}

export async function importFeed(inputUrl: string): Promise<FeedRefreshResult> {
  const url = normalizeFeedUrl(inputUrl);
  const parsed = await parser.parseURL(url);

  return upsertParsedFeed(url, parsed);
}

export async function refreshFeed(feedId: string): Promise<FeedRefreshResult> {
  const existing = await prisma.feed.findUnique({ where: { id: feedId } });

  if (!existing) {
    throw new Error("Feed not found.");
  }

  try {
    return await importFeed(existing.url);
  } catch (error) {
    await prisma.feed.update({
      where: { id: feedId },
      data: {
        lastError: error instanceof Error ? error.message : "Unable to refresh feed."
      }
    });
    throw error;
  }
}

export async function refreshAllFeeds(): Promise<{ results: FeedRefreshResult[]; errors: string[] }> {
  const feeds = await prisma.feed.findMany({ orderBy: { title: "asc" } });
  const results: FeedRefreshResult[] = [];
  const errors: string[] = [];

  for (const feed of feeds) {
    try {
      results.push(await refreshFeed(feed.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown refresh error.";
      errors.push(`${feed.title}: ${message}`);
    }
  }

  return { results, errors };
}

async function upsertParsedFeed(url: string, parsed: ParserFeed): Promise<FeedRefreshResult> {
  const feed = await prisma.feed.upsert({
    where: { url },
    update: {
      title: stringFromFeedValue(parsed.title) ?? url,
      siteUrl: stringFromFeedValue(parsed.link),
      description: textFromHtml(parsed.description) ?? null,
      imageUrl: stringFromFeedValue(parsed.image?.url),
      lastFetchedAt: new Date(),
      lastError: null
    },
    create: {
      url,
      title: stringFromFeedValue(parsed.title) ?? url,
      siteUrl: stringFromFeedValue(parsed.link),
      description: textFromHtml(parsed.description) ?? null,
      imageUrl: stringFromFeedValue(parsed.image?.url),
      lastFetchedAt: new Date(),
      lastError: null
    }
  });

  let imported = 0;
  let updated = 0;

  for (const item of parsed.items) {
    const guid = deriveEntryGuid(item);
    const rawContent =
      stringFromFeedValue(item["content:encoded"]) ??
      stringFromFeedValue(item.content) ??
      stringFromFeedValue(item.summary) ??
      stringFromFeedValue(item.contentSnippet);
    const content = cleanHtml(rawContent);
    const summary = textFromHtml(item.contentSnippet ?? item.summary ?? rawContent);
    const publishedAt = parseDate(stringFromFeedValue(item.isoDate) ?? stringFromFeedValue(item.pubDate));
    const title = stringFromFeedValue(item.title) ?? "Untitled entry";
    const link = stringFromFeedValue(item.link);
    const author = stringFromFeedValue(item.creator) ?? stringFromFeedValue(item.author);

    const existing = await prisma.entry.findUnique({
      where: {
        feedId_guid: {
          feedId: feed.id,
          guid
        }
      },
      select: { id: true }
    });

    await prisma.entry.upsert({
      where: {
        feedId_guid: {
          feedId: feed.id,
          guid
        }
      },
      update: {
        title,
        url: link,
        author,
        summary,
        content,
        publishedAt
      },
      create: {
        feedId: feed.id,
        guid,
        title,
        url: link,
        author,
        summary,
        content,
        publishedAt
      }
    });

    if (existing) {
      updated += 1;
    } else {
      imported += 1;
    }
  }

  return { feedId: feed.id, imported, updated };
}

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
