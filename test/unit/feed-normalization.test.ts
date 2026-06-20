import { describe, expect, it } from "vitest";

import {
  cleanHtml,
  deriveEntryGuid,
  normalizeFeedUrl,
  stringFromFeedValue,
  textFromHtml
} from "@/lib/feeds";

describe("feed normalization", () => {
  it("normalizes feed URLs and strips fragments", () => {
    expect(normalizeFeedUrl("example.com/feed.xml#top")).toBe("https://example.com/feed.xml");
    expect(normalizeFeedUrl("http://example.com/rss")).toBe("http://example.com/rss");
  });

  it("rejects empty and non-http URLs", () => {
    expect(() => normalizeFeedUrl("")).toThrow("Feed URL is required.");
    expect(() => normalizeFeedUrl("ftp://example.com/feed")).toThrow("Feed URL must use HTTP or HTTPS.");
  });

  it("derives a stable entry guid from preferred fields", () => {
    expect(deriveEntryGuid({ guid: "guid-1", link: "https://example.com/a" })).toBe("guid-1");
    expect(deriveEntryGuid({ link: "https://example.com/a" })).toBe("https://example.com/a");
    expect(deriveEntryGuid({ title: "Hello", isoDate: "2026-06-20T10:00:00Z" })).toBe(
      "Hello:2026-06-20T10:00:00Z"
    );
  });

  it("sanitizes content while preserving useful article markup", () => {
    expect(cleanHtml('<p>Hello</p><script>alert("x")</script>')).toBe("<p>Hello</p>");
    expect(textFromHtml("<p>Hello <strong>reader</strong></p>")).toBe("Hello reader");
  });

  it("normalizes XML parser field objects before persistence", () => {
    expect(stringFromFeedValue({ $: { "xmlns:dc": "http://purl.org/dc/elements/1.1/" } })).toBeNull();
    expect(stringFromFeedValue({ _: "Maria Latella", $: { "xmlns:dc": "http://purl.org/dc/elements/1.1/" } })).toBe(
      "Maria Latella"
    );
    expect(stringFromFeedValue({ "#text": "Il Sole 24 Ore" })).toBe("Il Sole 24 Ore");
  });
});
