"use client";

import { RefreshCcw, Trash2 } from "lucide-react";

import type { ReaderFeed as Feed } from "@/lib/reader-data";

type FeedSidebarProps = {
  feeds: Feed[];
  isVisible: boolean;
  selectedFeedId: string;
  unreadTotal: number;
  onDeleteFeed: (feedId: string) => void;
  onRefreshFeed: (feedId: string) => void;
  onSelectAllFeeds: () => void;
  onSelectFeed: (feedId: string) => void;
};

export function FeedSidebar({
  feeds,
  isVisible,
  selectedFeedId,
  unreadTotal,
  onDeleteFeed,
  onRefreshFeed,
  onSelectAllFeeds,
  onSelectFeed
}: FeedSidebarProps) {
  return (
    <aside className={`${isVisible ? "block" : "hidden"} min-h-0 border-r border-line bg-white md:block`}>
      <div className="flex h-full flex-col">
        <div className="border-b border-line p-3">
          <button
            type="button"
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
              selectedFeedId === "all" ? "bg-slate-900 text-white" : "hover:bg-slate-100"
            }`}
            onClick={onSelectAllFeeds}
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
            <FeedListItem
              key={feed.id}
              feed={feed}
              isSelected={selectedFeedId === feed.id}
              onDelete={() => onDeleteFeed(feed.id)}
              onRefresh={() => onRefreshFeed(feed.id)}
              onSelect={() => onSelectFeed(feed.id)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

type FeedListItemProps = {
  feed: Feed;
  isSelected: boolean;
  onDelete: () => void;
  onRefresh: () => void;
  onSelect: () => void;
};

function FeedListItem({ feed, isSelected, onDelete, onRefresh, onSelect }: FeedListItemProps) {
  return (
    <div
      className={`group mb-1 rounded-md border ${
        isSelected ? "border-accent bg-teal-50" : "border-transparent hover:bg-slate-100"
      }`}
    >
      <button type="button" className="flex w-full items-start gap-2 px-3 py-2 text-left" onClick={onSelect}>
        <div className="mt-1 h-2 w-2 flex-none">
          {feed.unreadCount > 0 && <div className="h-2 w-2 rounded-full bg-accent" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{feed.title}</div>
          <div className="truncate text-xs text-slate-500">
            {feed.entryCount} entries · {feed.unreadCount} unread
          </div>
          {feed.lastError && <div className="mt-1 line-clamp-2 text-xs text-red-600">{feed.lastError}</div>}
        </div>
      </button>
      <div className="flex items-center justify-end gap-1 px-2 pb-2">
        <button
          type="button"
          className="h-7 w-7 rounded-md text-slate-500 hover:bg-white hover:text-slate-900"
          onClick={onRefresh}
          title="Refresh feed"
        >
          <RefreshCcw size={14} className="mx-auto" />
        </button>
        <button
          type="button"
          className="h-7 w-7 rounded-md text-slate-500 hover:bg-white hover:text-red-600"
          onClick={onDelete}
          title="Delete feed"
        >
          <Trash2 size={14} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}
