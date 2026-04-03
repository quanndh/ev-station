## MVP deployment (Vercel + VPS)

### 1) Deploy web (Next.js) on Vercel
1. Push repo to GitHub.
2. Create a Vercel project for `apps/web` (or configure monorepo root).
3. Set environment variables (use `.env.example` as a template):
   - `OCPP_SERVICE_URL`: base URL tới CSMS OCPP (ví dụ `https://your-server-ip-or-domain:9000`)
   - `OCPP_API_KEY`: shared secret để Next gọi `/remote/start` và `/remote/stop`
   - `QR_SECRET`
   - (khuyến nghị) `AUTH_SECRET`

Vercel chỉ chạy phần Next.js (UI + API). CSMS OCPP không chạy trên Vercel vì cần WebSocket kết nối dài.

### 2) Deploy CSMS OCPP + Postgres on a VPS (Docker Compose)
Trên VPS:
1. Install Docker + Docker Compose.
2. Copy project (hoặc clone) và chạy:
   - `cp .env.example .env` (chỉnh `OCPP_API_KEY`, `QR_SECRET` nếu cần)
   - `docker compose up -d --build`
3. Mở port:
   - `9000` (WebSocket + HTTP remote endpoints)

Compose khởi động Postgres rồi container `ocpp` chạy:
 - `pnpm -C packages/db migrate:deploy`
 - `node apps/ocpp/dist/index.js`

### 3) Charge point websocket URL (OCPP 1.6J)
CSMS hiện hỗ trợ kết nối WebSocket theo format:
 - `ws://<VPS_HOST>:9000/ocpp/<chargePointId>`

Trong đó `<chargePointId>` phải khớp với trường `Station.ocppChargePointId` trong DB.

### 4) Connector assumption (MVP)
MVP cố định `connectorId = 1` cho mọi trạm.

