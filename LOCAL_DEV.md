## Chạy local (Web + OCPP + DB) và migrations

### Yêu cầu
- Node.js 20.x
- `pnpm` (repo dùng `pnpm@8.14.1`)
- Docker + Docker Compose (khuyến nghị, để chạy Postgres/OCPP nhanh)

---

## 1) Cài dependencies

Tại repo root:

```bash
pnpm install
```

---

## 2) Chuẩn bị biến môi trường

Tạo `.env` từ mẫu:

```bash
cp .env.example .env
```

Lưu ý monorepo:
- Next.js sẽ ưu tiên đọc env từ thư mục `apps/web` khi chạy `pnpm -C apps/web dev`.
- Repo hiện có cơ chế tự động load `.env` ở **repo root** cho Prisma (`packages/db`) để tiện dev.
- Nếu bạn muốn “chuẩn” theo Next.js, có thể copy DB URL vào `apps/web/.env.local`.

Các biến quan trọng:
- **`DATABASE_URL`**: Postgres connection string (local hoặc managed)
- **`OCPP_SERVICE_URL`**: URL base của OCPP service (web gọi HTTP `/remote/start|stop`)
- **`OCPP_API_KEY`**: shared secret giữa web ↔ OCPP (header `x-api-key`)
- **`QR_SECRET`**: secret để sign/verify token QR
- **`AUTH_SECRET`**: secret cho Auth.js (production bắt buộc)

---

## 3) Chạy Postgres + OCPP bằng Docker Compose (khuyến nghị)

Chạy:

```bash
docker compose up -d --build
```

Compose sẽ:
- chạy Postgres (port `5432`)
- build + chạy OCPP service (port `9000`)
- tự apply migrations bằng `pnpm -C packages/db migrate:deploy` khi OCPP container start

Healthcheck nhanh:
- `http://localhost:9000/health`

---

## 4) Apply migrations (khi DB đã sẵn sàng)

Chạy ở repo root (hoặc bất kỳ đâu):

```bash
pnpm -C packages/db migrate:deploy
```

Nếu muốn regenerate Prisma Client (thường không cần mỗi lần chạy):

```bash
pnpm -C packages/db generate
```

---

## 5) Chạy Web (Next.js)

Chạy dev server:

```bash
pnpm -C apps/web dev
```

Mặc định web chạy ở `http://localhost:3000`.

---

## 6) Chạy OCPP service (không dùng Docker)

Nếu bạn không muốn dùng compose, có thể chạy OCPP bằng Node:

```bash
pnpm -C apps/ocpp dev
```

Mặc định:
- WebSocket path: `/ocpp`
- HTTP: `POST /remote/start`, `POST /remote/stop`
- Port: `9000`

Charger kết nối:
- `ws://localhost:9000/ocpp/<chargePointId>`

`<chargePointId>` phải khớp `Station.ocppChargePointId` trong DB.

---

## 7) Tạo migration mới

### Cách A (khuyến nghị): Có DB thật, tạo migration file (`--create-only`)

Đảm bảo `DATABASE_URL` trỏ tới DB bạn dùng để phát triển (local/compose).

```bash
pnpm -w prisma migrate dev --create-only --schema=packages/db/prisma/schema.prisma --name your_change_name
```

Sau đó apply:

```bash
pnpm -C packages/db migrate:deploy
```

### Cách B: Không có DB, generate SQL từ schema (không tạo migration folder tự động)

```bash
pnpm -w prisma migrate diff --from-empty --to-schema-datamodel=packages/db/prisma/schema.prisma --script
```

Bạn có thể copy output vào file `packages/db/prisma/migrations/<xxxx_name>/migration.sql`.

---

## 8) Chạy build toàn repo (sanity check)

```bash
pnpm build
```

