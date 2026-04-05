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
    <div className="mt-4 flex justify-center sm:mt-5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="sm:h-12 sm:px-8 sm:text-base"
        onClick={() => void onLoadMore()}
        disabled={loading}
      >
        {loading ? "Đang tải…" : "Tải thêm"}
      </Button>
    </div>
  );
}
