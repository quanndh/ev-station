"use client";

import { Button } from "@/components/ui/button";
import { LoadMoreButton } from "@/components/ui/load-more-button";

/**
 * Dưới `md`: nút Tải thêm (append).
 * Từ `md` trở lên: Trước / Trang n / Sau (fetch theo offset trang).
 */
export function ListPaginationFooter({
  hasMore,
  loadingMore,
  onLoadMore,
  page,
  onGoToPage,
  itemCount,
}: {
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void | Promise<void>;
  page: number;
  onGoToPage: (page: number) => void | Promise<void>;
  itemCount: number;
}) {
  const showDesktopNav = itemCount > 0 || page > 1 || hasMore;
  const canPrev = page > 1;
  const canNext = hasMore;

  return (
    <>
      <div className="md:hidden">
        <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={onLoadMore} />
      </div>
      {showDesktopNav ? (
        <nav
          className="mt-4 hidden flex-col items-center gap-2 py-2 md:flex sm:mt-5"
          aria-label="Phân trang"
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canPrev || loadingMore}
              onClick={() => void onGoToPage(page - 1)}
            >
              Trước
            </Button>
            <span className="min-w-24 text-center text-sm font-medium text-muted-foreground">
              Trang {page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canNext || loadingMore}
              onClick={() => void onGoToPage(page + 1)}
            >
              Sau
            </Button>
          </div>
        </nav>
      ) : null}
    </>
  );
}
