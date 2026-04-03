"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authedFetch } from "@/lib/authClient";

export function ConfirmPaymentButton({
  sessionId,
  onConfirmed,
}: {
  sessionId: string;
  onConfirmed?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await authedFetch(`/api/payments/${sessionId}/confirm`, { method: "POST" });
          const d = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error((d as { error?: string }).error ?? "Xác nhận thất bại");
          }
          onConfirmed?.();
          if (!onConfirmed) window.location.reload();
        } catch (e: unknown) {
          window.alert(e instanceof Error ? e.message : "Xác nhận thất bại");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Đang xử lý…" : "Xác nhận đã nhận tiền"}
    </Button>
  );
}
