/** Kích thước trang mặc định cho API danh sách */
export const LIST_PAGE_SIZE = 20;

export function parseListPagination(req: Request): { limit: number; offset: number } {
  const url = new URL(req.url);
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "", 10);
  const rawOffset = parseInt(url.searchParams.get("offset") ?? "", 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, rawLimit) : LIST_PAGE_SIZE;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  return { limit, offset };
}

/** Prisma: lấy limit+1 bản ghi để biết còn trang sau */
export function listTake(limit: number) {
  return limit + 1;
}

export function sliceListPage<T>(rows: T[], limit: number): { items: T[]; hasMore: boolean } {
  if (rows.length <= limit) return { items: rows, hasMore: false };
  return { items: rows.slice(0, limit), hasMore: true };
}

export function listMeta(offset: number, itemsLength: number, hasMore: boolean) {
  return {
    hasMore,
    nextOffset: offset + itemsLength,
  };
}
