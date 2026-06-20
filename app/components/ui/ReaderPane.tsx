"use client";

import { BookOpen, Check, Circle, ExternalLink, Star } from "lucide-react";

import type { ReaderEntry as Entry } from "@/lib/reader-data";
import { formatDate } from "./date";

type ReaderPaneProps = {
  entry: Entry | null;
  isVisible: boolean;
  onToggleRead: (entry: Entry) => void;
  onToggleStarred: (entry: Entry) => void;
};

export function ReaderPane({ entry, isVisible, onToggleRead, onToggleStarred }: ReaderPaneProps) {
  return (
    <article className={`${isVisible ? "block" : "hidden"} min-h-0 overflow-y-auto bg-white md:block`}>
      {entry ? (
        <div className="mx-auto max-w-3xl px-5 py-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent">{entry.feed.title}</p>
              <h2 className="text-2xl font-semibold leading-tight text-slate-950">{entry.title}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {[entry.author, formatDate(entry.publishedAt)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <EntryActions entry={entry} onToggleRead={onToggleRead} onToggleStarred={onToggleStarred} />
          </div>

          <div
            className="reader-content prose prose-slate max-w-none text-[15px] leading-7 text-slate-800"
            dangerouslySetInnerHTML={{
              __html: entry.content ?? entry.summary ?? "<p>No article preview is available for this entry.</p>"
            }}
          />
        </div>
      ) : (
        <EmptyReaderState />
      )}
    </article>
  );
}

type EntryActionsProps = {
  entry: Entry;
  onToggleRead: (entry: Entry) => void;
  onToggleStarred: (entry: Entry) => void;
};

function EntryActions({ entry, onToggleRead, onToggleStarred }: EntryActionsProps) {
  return (
    <div className="flex flex-none items-center gap-2">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-50"
        onClick={() => onToggleRead(entry)}
        title={entry.isRead ? "Mark unread" : "Mark read"}
      >
        {entry.isRead ? <Circle size={16} /> : <Check size={16} />}
      </button>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-50"
        onClick={() => onToggleStarred(entry)}
        title={entry.isStarred ? "Remove star" : "Star entry"}
      >
        <Star size={16} className={entry.isStarred ? "fill-amber-400 text-amber-500" : ""} />
      </button>
      {entry.url && (
        <a
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-50"
          href={entry.url}
          target="_blank"
          rel="noreferrer"
          title="Open original"
        >
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  );
}

function EmptyReaderState() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-sm rounded-md border border-dashed border-line p-6 text-center">
        <BookOpen className="mx-auto mb-3 text-slate-400" size={28} />
        <h2 className="font-semibold text-slate-900">No article selected</h2>
        <p className="mt-2 text-sm text-slate-500">Import a feed and choose an entry to read it here.</p>
      </div>
    </div>
  );
}
