"use client";

import { Button } from "@/components/ui/button";

export function LoadMoreButton({
  hasMore,
  loading,
  onLoadMore,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void | Promise<void>;
}) {
  if (!hasMore) return null;
  return (
    <div className="mt-6 flex justify-center">
      <Button type="button" variant="outline" size="lg" onClick={() => void onLoadMore()} disabled={loading}>
        {loading ? "Đang tải…" : "Tải thêm"}
      </Button>
    </div>
  );
}
