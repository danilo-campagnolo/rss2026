"use client";

import { X } from "lucide-react";

type NotificationBarProps = {
  message: string | null;
  error: string | null;
  onDismiss: () => void;
};

export function NotificationBar({ message, error, onDismiss }: NotificationBarProps) {
  if (!message && !error) return null;

  return (
    <div
      className={`border-b px-4 py-2 text-sm ${
        error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3">
        <span>{error ?? message}</span>
        <button type="button" onClick={onDismiss} title="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

