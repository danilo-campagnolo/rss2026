"use client";

import { Loader2, X } from "lucide-react";
import type { FormEvent } from "react";

type ImportFeedDialogProps = {
  feedUrl: string;
  isImporting: boolean;
  onClose: () => void;
  onFeedUrlChange: (feedUrl: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ImportFeedDialog({
  feedUrl,
  isImporting,
  onClose,
  onFeedUrlChange,
  onSubmit
}: ImportFeedDialogProps) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/40 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Add feed</h2>
            <p className="text-sm text-slate-500">Paste an RSS or Atom feed URL.</p>
          </div>
          <button type="button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
        <input
          value={feedUrl}
          onChange={(event) => onFeedUrlChange(event.target.value)}
          placeholder="https://example.com/feed.xml"
          className="mb-4 h-11 w-full rounded-md border border-line px-3 outline-none focus:border-accent"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-md border border-line px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
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
  );
}
