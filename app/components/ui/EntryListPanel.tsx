"use client";

import { Check, CheckCheck, Circle, Search, Star } from "lucide-react";

import type { ReaderEntry as Entry, StatusFilter } from "@/lib/reader-data";
import { formatDate } from "./date";

type EntryListPanelProps = {
  entries: Entry[];
  isVisible: boolean;
  query: string;
  selectedEntryId: string | null;
  status: StatusFilter;
  canMarkAllRead: boolean;
  isMarkingAllRead: boolean;
  onMarkAllRead: () => void;
  onQueryChange: (query: string) => void;
  onSelectEntry: (entry: Entry) => void;
  onStatusChange: (status: StatusFilter) => void;
};

export function EntryListPanel({
  entries,
  isVisible,
  query,
  selectedEntryId,
  status,
  canMarkAllRead,
  isMarkingAllRead,
  onMarkAllRead,
  onQueryChange,
  onSelectEntry,
  onStatusChange
}: EntryListPanelProps) {
  return (
    <section className={`${isVisible ? "block" : "hidden"} min-h-0 border-r border-line bg-panel md:block`}>
      <div className="flex h-full flex-col">
        <EntryListControls
          query={query}
          status={status}
          canMarkAllRead={canMarkAllRead}
          isMarkingAllRead={isMarkingAllRead}
          onMarkAllRead={onMarkAllRead}
          onQueryChange={onQueryChange}
          onStatusChange={onStatusChange}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {entries.length === 0 && (
            <div className="m-4 rounded-md border border-dashed border-line bg-white p-6 text-sm text-slate-500">
              No entries match this view.
            </div>
          )}

          {entries.map((entry) => (
            <EntryListItem
              key={entry.id}
              entry={entry}
              isSelected={selectedEntryId === entry.id}
              onSelect={() => onSelectEntry(entry)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type EntryListControlsProps = {
  query: string;
  status: StatusFilter;
  canMarkAllRead: boolean;
  isMarkingAllRead: boolean;
  onMarkAllRead: () => void;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: StatusFilter) => void;
};

function EntryListControls({
  query,
  status,
  canMarkAllRead,
  isMarkingAllRead,
  onMarkAllRead,
  onQueryChange,
  onStatusChange
}: EntryListControlsProps) {
  return (
    <div className="space-y-3 border-b border-line bg-white p-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search entries"
            className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onMarkAllRead}
          disabled={!canMarkAllRead || isMarkingAllRead}
          title="Mark all read"
        >
          <CheckCheck size={17} />
        </button>
      </div>
      <div className="grid grid-cols-4 rounded-md border border-line bg-slate-50 p-1 text-xs">
        {(["all", "unread", "read", "starred"] as StatusFilter[]).map((item) => (
          <button
            key={item}
            type="button"
            className={`h-8 rounded capitalize ${
              status === item ? "bg-white font-medium text-accent shadow-soft" : "text-slate-500"
            }`}
            onClick={() => onStatusChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

type EntryListItemProps = {
  entry: Entry;
  isSelected: boolean;
  onSelect: () => void;
};

function EntryListItem({ entry, isSelected, onSelect }: EntryListItemProps) {
  return (
    <button
      type="button"
      className={`block w-full border-b border-line bg-white px-4 py-3 text-left hover:bg-slate-50 ${
        isSelected ? "border-l-4 border-l-accent" : "border-l-4 border-l-transparent"
      }`}
      onClick={onSelect}
    >
      <div className="mb-2 flex items-start gap-2">
        {entry.isRead ? (
          <Check size={15} className="mt-1 text-slate-400" />
        ) : (
          <Circle size={15} className="mt-1 fill-accent text-accent" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className={`line-clamp-2 text-sm ${entry.isRead ? "font-medium text-slate-600" : "font-semibold text-slate-950"}`}>
            {entry.title}
          </h2>
          <p className="mt-1 truncate text-xs text-slate-500">
            {entry.feed.title} · {formatDate(entry.publishedAt)}
          </p>
        </div>
        <Star size={15} className={entry.isStarred ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
      </div>
      {entry.summary && <p className="line-clamp-2 pl-6 text-xs leading-5 text-slate-600">{entry.summary}</p>}
    </button>
  );
}
