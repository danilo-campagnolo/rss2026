"use client";

import type { MobileView } from "@/app/components/reader-types";

type MobileNavProps = {
  mobileView: MobileView;
  onViewChange: (view: MobileView) => void;
};

export function MobileNav({ mobileView, onViewChange }: MobileNavProps) {
  return (
    <nav className="grid grid-cols-3 border-b border-line bg-white text-sm md:hidden">
      {(["feeds", "entries", "reader"] as MobileView[]).map((view) => (
        <button
          key={view}
          type="button"
          className={`h-10 capitalize ${
            mobileView === view ? "border-b-2 border-accent font-medium text-accent" : "text-slate-500"
          }`}
          onClick={() => onViewChange(view)}
        >
          {view}
        </button>
      ))}
    </nav>
  );
}
