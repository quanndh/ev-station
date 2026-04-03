"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AddFab({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="pointer-events-none fixed right-4 z-40 flex justify-end sm:right-6"
      style={{
        bottom: "max(2.25rem, calc(env(safe-area-inset-bottom, 0px) + 1.75rem))",
      }}
    >
      <Button
        type="button"
        aria-label="Thêm"
        title="Thêm"
        className="pointer-events-auto !h-16 !w-16 !min-h-16 !min-w-16 !p-0 shadow-[var(--shadow-float)]"
        onClick={onClick}
      >
        <Plus className="h-7 w-7 shrink-0" aria-hidden />
      </Button>
    </div>
  );
}
