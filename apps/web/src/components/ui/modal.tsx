"use client";

import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/35 backdrop-blur-[1px]"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 w-full max-w-lg max-h-[min(90dvh,40rem)] overflow-y-auto rounded-[var(--radius-card-lg)] border border-[color:var(--border)]/60 bg-[color:var(--background)] p-6 shadow-[var(--shadow-float)]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="modal-title"
            className="font-serif text-xl font-extrabold tracking-tight text-[color:var(--foreground)]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--border)]/60 bg-white/60 px-3 py-1 text-sm font-semibold text-[color:var(--muted-foreground)] hover:bg-white"
          >
            Đóng
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
