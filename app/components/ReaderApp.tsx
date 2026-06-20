"use client";

import {
  BookOpen,
  Check,
  Circle,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Star,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type { ReaderEntry as Entry, ReaderFeed as Feed, StatusFilter } from "@/lib/reader-data";

type ReaderAppProps = {
  initialFeeds?: Feed[];
  initialEntries?: Entry[];
  initialError?: string | null;
};

type MobileView = "feeds" | "entries" | "reader";

export function ReaderApp({
  initialFeeds = [],
  initialEntries = [],
  initialError = null
}: ReaderAppProps) {
  const [feeds, setFeeds] = useState<Feed[]>(initialFeeds);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [selectedFeedId, setSelectedFeedId] = useState("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialEntries[0]?.id ?? null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [mobileView, setMobileView] = useState<MobileView>("entries");
  const hasMountedFilters = useRef(false);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? entries[0] ?? null,
    [entries, selectedEntryId]
  );

  const unreadTotal = feeds.reduce((total, feed) => total + feed.unreadCount, 0);

  useEffect(() => {
    if (initialError || initialFeeds.length === 0) {
      return;
    }

    void refreshAll({ silent: true });
    // Initial reader data is server-rendered; silently refresh known feeds after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasMountedFilters.current) {
      hasMountedFilters.current = true;
      return;
    }

    void loadEntries();
    // Entry reloads are intentionally keyed to view controls, not function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeedId, status, query]);

  async function loadFeeds() {
    const response = await fetch("/api/feeds", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load feeds.");
    }

    setFeeds(data.feeds);
  }

  async function loadEntries() {
    const params = new URLSearchParams();
    params.set("feedId", selectedFeedId);
    params.set("status", status);
    if (query.trim()) {
      params.set("q", query.trim());
    }

    const response = await fetch(`/api/entries?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load entries.");
    }

    setEntries(data.entries);
    setSelectedEntryId((current) => {
      if (current && data.entries.some((entry: Entry) => entry.id === current)) {
        return current;
      }

      return data.entries[0]?.id ?? null;
    });
  }

  async function importNewFeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsImporting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: feedUrl })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to import feed.");
      }

      setMessage(`Imported ${data.imported} new entries and updated ${data.updated}.`);
      setFeedUrl("");
      setIsImportOpen(false);
      await Promise.all([loadFeeds(), loadEntries()]);
      setSelectedFeedId(data.feedId);
      setMobileView("entries");
    } catch (requestError) {
      setError(getClientError(requestError));
    } finally {
      setIsImporting(false);
    }
  }

  async function refreshAll(options?: { silent?: boolean }) {
    setIsRefreshing(true);
    if (!options?.silent) {
      setMessage(null);
      setError(null);
    }

    try {
      const response = await fetch("/api/refresh-all", { method: "POST" });
      const data = await response.json();

      if (!response.ok && response.status !== 207) {
        throw new Error(data.error ?? "Unable to refresh feeds.");
      }

      await Promise.all([loadFeeds(), loadEntries()]);

      if (!options?.silent) {
        const imported = data.results.reduce((total: number, item: { imported: number }) => total + item.imported, 0);
        setMessage(`Refresh complete. ${imported} new entries imported.`);
      }
    } catch (requestError) {
      if (!options?.silent) {
        setError(getClientError(requestError));
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  async function refreshFeed(feedId: string) {
    setIsRefreshing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/feeds/${feedId}/refresh`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to refresh feed.");
      }

      setMessage(`Feed refreshed. ${data.imported} new entries imported.`);
      await Promise.all([loadFeeds(), loadEntries()]);
    } catch (requestError) {
      setError(getClientError(requestError));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function deleteFeed(feedId: string) {
    const feed = feeds.find((item) => item.id === feedId);

    if (!feed || !window.confirm(`Delete "${feed.title}" and all of its entries?`)) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/feeds/${feedId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete feed.");
      }

      if (selectedFeedId === feedId) {
        setSelectedFeedId("all");
      }

      setMessage("Feed deleted.");
      await Promise.all([loadFeeds(), loadEntries()]);
    } catch (requestError) {
      setError(getClientError(requestError));
    }
  }

  async function updateEntry(entryId: string, patch: Pick<Partial<Entry>, "isRead" | "isStarred">) {
    const previousEntries = entries;
    setEntries((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry))
    );

    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update entry.");
      }

      await loadFeeds();
    } catch (requestError) {
      setEntries(previousEntries);
      setError(getClientError(requestError));
    }
  }

  function selectEntry(entry: Entry) {
    setSelectedEntryId(entry.id);
    setMobileView("reader");

    if (!entry.isRead) {
      void updateEntry(entry.id, { isRead: true });
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-ink">
      <div className="flex h-screen flex-col overflow-hidden">
        <header className="flex min-h-16 items-center justify-between border-b border-line bg-white px-4 shadow-soft">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
              <BookOpen size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">RSS Feed Engine</h1>
              <p className="truncate text-xs text-slate-500">{feeds.length} feeds · {unreadTotal} unread</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void refreshAll()}
              disabled={isRefreshing || feeds.length === 0}
              title="Refresh all feeds"
            >
              <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-teal-800"
              onClick={() => setIsImportOpen(true)}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add feed</span>
            </button>
          </div>
        </header>

        {(message || error) && (
          <div className={`border-b px-4 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3">
              <span>{error ?? message}</span>
              <button type="button" onClick={() => { setError(null); setMessage(null); }} title="Dismiss">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <nav className="grid grid-cols-3 border-b border-line bg-white text-sm md:hidden">
          {(["feeds", "entries", "reader"] as MobileView[]).map((view) => (
            <button
              key={view}
              type="button"
              className={`h-10 capitalize ${mobileView === view ? "border-b-2 border-accent font-medium text-accent" : "text-slate-500"}`}
              onClick={() => setMobileView(view)}
            >
              {view}
            </button>
          ))}
        </nav>

        <section className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(320px,420px)_1fr]">
          <aside className={`${mobileView === "feeds" ? "block" : "hidden"} min-h-0 border-r border-line bg-white md:block`}>
            <div className="flex h-full flex-col">
              <div className="border-b border-line p-3">
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedFeedId === "all" ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
                  onClick={() => { setSelectedFeedId("all"); setMobileView("entries"); }}
                >
                  <span>All feeds</span>
                  <span className="text-xs opacity-80">{unreadTotal}</span>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {feeds.length === 0 && (
                  <div className="rounded-md border border-dashed border-line p-4 text-sm text-slate-500">
                    Import a feed URL to start building your reader.
                  </div>
                )}

                {feeds.map((feed) => (
                  <div
                    key={feed.id}
                    className={`group mb-1 rounded-md border ${selectedFeedId === feed.id ? "border-accent bg-teal-50" : "border-transparent hover:bg-slate-100"}`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left"
                      onClick={() => { setSelectedFeedId(feed.id); setMobileView("entries"); }}
                    >
                      <div className="mt-1 h-2 w-2 flex-none rounded-full bg-accent" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{feed.title}</div>
                        <div className="truncate text-xs text-slate-500">{feed.entryCount} entries · {feed.unreadCount} unread</div>
                        {feed.lastError && <div className="mt-1 line-clamp-2 text-xs text-red-600">{feed.lastError}</div>}
                      </div>
                    </button>
                    <div className="flex items-center justify-end gap-1 px-2 pb-2">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-md text-slate-500 hover:bg-white hover:text-slate-900"
                        onClick={() => void refreshFeed(feed.id)}
                        title="Refresh feed"
                      >
                        <RefreshCcw size={14} className="mx-auto" />
                      </button>
                      <button
                        type="button"
                        className="h-7 w-7 rounded-md text-slate-500 hover:bg-white hover:text-red-600"
                        onClick={() => void deleteFeed(feed.id)}
                        title="Delete feed"
                      >
                        <Trash2 size={14} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className={`${mobileView === "entries" ? "block" : "hidden"} min-h-0 border-r border-line bg-panel md:block`}>
            <div className="flex h-full flex-col">
              <div className="space-y-3 border-b border-line bg-white p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search entries"
                    className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div className="grid grid-cols-4 rounded-md border border-line bg-slate-50 p-1 text-xs">
                  {(["all", "unread", "read", "starred"] as StatusFilter[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`h-8 rounded capitalize ${status === item ? "bg-white font-medium text-accent shadow-soft" : "text-slate-500"}`}
                      onClick={() => setStatus(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {entries.length === 0 && (
                  <div className="m-4 rounded-md border border-dashed border-line bg-white p-6 text-sm text-slate-500">
                    No entries match this view.
                  </div>
                )}

                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`block w-full border-b border-line bg-white px-4 py-3 text-left hover:bg-slate-50 ${selectedEntry?.id === entry.id ? "border-l-4 border-l-accent" : "border-l-4 border-l-transparent"}`}
                    onClick={() => selectEntry(entry)}
                  >
                    <div className="mb-2 flex items-start gap-2">
                      {entry.isRead ? <Check size={15} className="mt-1 text-slate-400" /> : <Circle size={15} className="mt-1 fill-accent text-accent" />}
                      <div className="min-w-0 flex-1">
                        <h2 className={`line-clamp-2 text-sm ${entry.isRead ? "font-medium text-slate-600" : "font-semibold text-slate-950"}`}>{entry.title}</h2>
                        <p className="mt-1 truncate text-xs text-slate-500">{entry.feed.title} · {formatDate(entry.publishedAt)}</p>
                      </div>
                      <Star size={15} className={entry.isStarred ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                    </div>
                    {entry.summary && <p className="line-clamp-2 pl-6 text-xs leading-5 text-slate-600">{entry.summary}</p>}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <article className={`${mobileView === "reader" ? "block" : "hidden"} min-h-0 overflow-y-auto bg-white md:block`}>
            {selectedEntry ? (
              <div className="mx-auto max-w-3xl px-5 py-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent">{selectedEntry.feed.title}</p>
                    <h2 className="text-2xl font-semibold leading-tight text-slate-950">{selectedEntry.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {[selectedEntry.author, formatDate(selectedEntry.publishedAt)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-50"
                      onClick={() => void updateEntry(selectedEntry.id, { isRead: !selectedEntry.isRead })}
                      title={selectedEntry.isRead ? "Mark unread" : "Mark read"}
                    >
                      {selectedEntry.isRead ? <Circle size={16} /> : <Check size={16} />}
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-50"
                      onClick={() => void updateEntry(selectedEntry.id, { isStarred: !selectedEntry.isStarred })}
                      title={selectedEntry.isStarred ? "Remove star" : "Star entry"}
                    >
                      <Star size={16} className={selectedEntry.isStarred ? "fill-amber-400 text-amber-500" : ""} />
                    </button>
                    {selectedEntry.url && (
                      <a
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-50"
                        href={selectedEntry.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Open original"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>

                <div
                  className="reader-content prose prose-slate max-w-none text-[15px] leading-7 text-slate-800"
                  dangerouslySetInnerHTML={{
                    __html: selectedEntry.content ?? selectedEntry.summary ?? "<p>No article preview is available for this entry.</p>"
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <div className="max-w-sm rounded-md border border-dashed border-line p-6 text-center">
                  <BookOpen className="mx-auto mb-3 text-slate-400" size={28} />
                  <h2 className="font-semibold text-slate-900">No article selected</h2>
                  <p className="mt-2 text-sm text-slate-500">Import a feed and choose an entry to read it here.</p>
                </div>
              </div>
            )}
          </article>
        </section>
      </div>

      {isImportOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={importNewFeed} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Add feed</h2>
                <p className="text-sm text-slate-500">Paste an RSS or Atom feed URL.</p>
              </div>
              <button type="button" onClick={() => setIsImportOpen(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <input
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
              placeholder="https://example.com/feed.xml"
              className="mb-4 h-11 w-full rounded-md border border-line px-3 outline-none focus:border-accent"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-md border border-line px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setIsImportOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isImporting}
              >
                {isImporting && <Loader2 className="animate-spin" size={16} />}
                Import
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function getClientError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(value));
}
