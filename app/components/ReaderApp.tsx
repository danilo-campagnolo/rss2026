"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type { ReaderEntry as Entry, ReaderFeed as Feed, StatusFilter } from "@/lib/reader-data";
import type { MobileView } from "./reader-types";
import { EntryListPanel } from "./ui/EntryListPanel";
import { FeedSidebar } from "./ui/FeedSidebar";
import { Header } from "./ui/Header";
import { ImportFeedDialog } from "./ui/ImportFeedDialog";
import { MobileNav } from "./ui/MobileNav";
import { NotificationBar } from "./ui/NotificationBar";
import { ReaderPane } from "./ui/ReaderPane";

type ReaderAppProps = {
  initialFeeds?: Feed[];
  initialEntries?: Entry[];
  initialError?: string | null;
};

type EntryFilterSnapshot = {
  feedId: string;
  status: StatusFilter;
  query: string;
};

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
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [mobileView, setMobileView] = useState<MobileView>("entries");
  const hasMountedFilters = useRef(false);
  const entryFilters = useRef<EntryFilterSnapshot>({ feedId: "all", status: "all", query: "" });
  const latestEntryRequestId = useRef(0);

  entryFilters.current = { feedId: selectedFeedId, status, query };

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? entries[0] ?? null,
    [entries, selectedEntryId]
  );

  const unreadTotal = feeds.reduce((total, feed) => total + feed.unreadCount, 0);
  const canMarkAllRead = entries.some((entry) => !entry.isRead);

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

  async function loadEntries(filters?: Partial<EntryFilterSnapshot>) {
    const filterSnapshot = { ...entryFilters.current, ...filters };
    const requestId = latestEntryRequestId.current + 1;
    latestEntryRequestId.current = requestId;
    const params = new URLSearchParams();
    params.set("feedId", filterSnapshot.feedId);
    params.set("status", filterSnapshot.status);
    if (filterSnapshot.query.trim()) {
      params.set("q", filterSnapshot.query.trim());
    }

    const response = await fetch(`/api/entries?${params.toString()}`, { cache: "no-store" });
    const data = (await response.json()) as { entries?: Entry[]; error?: string };

    if (requestId !== latestEntryRequestId.current) {
      return;
    }

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load entries.");
    }

    const nextEntries = data.entries ?? [];
    setEntries(nextEntries);
    setSelectedEntryId((current) => {
      if (current && nextEntries.some((entry) => entry.id === current)) {
        return current;
      }

      return nextEntries[0]?.id ?? null;
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
      updateSelectedFeed(data.feedId);
      await Promise.all([loadFeeds(), loadEntries({ feedId: data.feedId })]);
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

      const nextFeedId = selectedFeedId === feedId ? "all" : selectedFeedId;

      if (nextFeedId === "all") {
        updateSelectedFeed("all");
      }

      setMessage("Feed deleted.");
      await Promise.all([loadFeeds(), loadEntries({ feedId: nextFeedId })]);
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

  async function markAllRead() {
    const filterSnapshot = entryFilters.current;
    setIsMarkingAllRead(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filterSnapshot, isRead: true })
      });
      const data = (await response.json()) as { count?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to mark entries as read.");
      }

      await loadFeeds();
      if (entryFiltersMatch(filterSnapshot, entryFilters.current)) {
        await loadEntries(filterSnapshot);
      }

      setMessage(`Marked ${data.count ?? 0} entries as read.`);
    } catch (requestError) {
      setError(getClientError(requestError));
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  function selectEntry(entry: Entry) {
    setSelectedEntryId(entry.id);
    setMobileView("reader");

    if (!entry.isRead) {
      void updateEntry(entry.id, { isRead: true });
    }
  }

  function updateSelectedFeed(feedId: string) {
    entryFilters.current = { ...entryFilters.current, feedId };
    setSelectedFeedId(feedId);
  }

  function updateStatus(nextStatus: StatusFilter) {
    entryFilters.current = { ...entryFilters.current, status: nextStatus };
    setStatus(nextStatus);
  }

  function updateQuery(nextQuery: string) {
    entryFilters.current = { ...entryFilters.current, query: nextQuery };
    setQuery(nextQuery);
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-ink">
      <div className="flex h-screen flex-col overflow-hidden">
        <Header
          feedCount={feeds.length}
          hasFeeds={feeds.length > 0}
          unreadTotal={unreadTotal}
          isRefreshing={isRefreshing}
          onRefreshAll={() => void refreshAll()}
          onOpenImport={() => setIsImportOpen(true)}
        />

        <NotificationBar
          message={message}
          error={error}
          onDismiss={() => {
            setError(null);
            setMessage(null);
          }}
        />

        <MobileNav mobileView={mobileView} onViewChange={setMobileView} />

        <section className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(320px,420px)_1fr]">
          <FeedSidebar
            feeds={feeds}
            isVisible={mobileView === "feeds"}
            selectedFeedId={selectedFeedId}
            unreadTotal={unreadTotal}
            onDeleteFeed={(feedId) => void deleteFeed(feedId)}
            onRefreshFeed={(feedId) => void refreshFeed(feedId)}
            onSelectAllFeeds={() => {
              updateSelectedFeed("all");
              setMobileView("entries");
            }}
            onSelectFeed={(feedId) => {
              updateSelectedFeed(feedId);
              setMobileView("entries");
            }}
          />

          <EntryListPanel
            entries={entries}
            isVisible={mobileView === "entries"}
            query={query}
            selectedEntryId={selectedEntry?.id ?? null}
            status={status}
            canMarkAllRead={canMarkAllRead}
            isMarkingAllRead={isMarkingAllRead}
            onMarkAllRead={() => void markAllRead()}
            onQueryChange={updateQuery}
            onSelectEntry={selectEntry}
            onStatusChange={updateStatus}
          />

          <ReaderPane
            entry={selectedEntry}
            isVisible={mobileView === "reader"}
            onToggleRead={(entry) => void updateEntry(entry.id, { isRead: !entry.isRead })}
            onToggleStarred={(entry) => void updateEntry(entry.id, { isStarred: !entry.isStarred })}
          />
        </section>
      </div>

      {isImportOpen && (
        <ImportFeedDialog
          feedUrl={feedUrl}
          isImporting={isImporting}
          onClose={() => setIsImportOpen(false)}
          onFeedUrlChange={setFeedUrl}
          onSubmit={importNewFeed}
        />
      )}
    </main>
  );
}

function getClientError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function entryFiltersMatch(first: EntryFilterSnapshot, second: EntryFilterSnapshot): boolean {
  return first.feedId === second.feedId && first.status === second.status && first.query === second.query;
}
