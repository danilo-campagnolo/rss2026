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
              setSelectedFeedId("all");
              setMobileView("entries");
            }}
            onSelectFeed={(feedId) => {
              setSelectedFeedId(feedId);
              setMobileView("entries");
            }}
          />

          <EntryListPanel
            entries={entries}
            isVisible={mobileView === "entries"}
            query={query}
            selectedEntryId={selectedEntry?.id ?? null}
            status={status}
            onQueryChange={setQuery}
            onSelectEntry={selectEntry}
            onStatusChange={setStatus}
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
