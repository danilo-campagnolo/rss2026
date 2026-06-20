"use client";

import { BookOpen, Plus, RefreshCcw } from "lucide-react";

type HeaderProps = {
  feedCount: number;
  hasFeeds: boolean;
  unreadTotal: number;
  isRefreshing: boolean;
  onRefreshAll: () => void;
  onOpenImport: () => void;
};

export function Header({
  feedCount,
  hasFeeds,
  unreadTotal,
  isRefreshing,
  onRefreshAll,
  onOpenImport
}: HeaderProps) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-line bg-white px-4 shadow-soft">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
          <BookOpen size={19} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">RSS Feed Engine</h1>
          <p className="truncate text-xs text-slate-500">
            {feedCount} feeds · {unreadTotal} unread
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onRefreshAll}
          disabled={isRefreshing || !hasFeeds}
          title="Refresh all feeds"
        >
          <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-teal-800"
          onClick={onOpenImport}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add feed</span>
        </button>
      </div>
    </header>
  );
}
