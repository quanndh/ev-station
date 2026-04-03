/**
 * Chạy Prisma CLI với biến môi trường từ `.env` ở **root monorepo**
 * (tránh lỗi DATABASE_URL khi `pnpm -C packages/db exec prisma ...`).
 *
 * Dùng: node scripts/prisma-with-env.mjs migrate deploy --schema=packages/db/prisma/schema.prisma
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(root, ".env") });

if (!process.env.DATABASE_URL) {
  console.error(
    "Thiếu DATABASE_URL. Thêm vào file .env ở root repo (cùng cấp package.json).",
  );
  process.exit(1);
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/prisma-with-env.mjs <prisma args...>");
  process.exit(1);
}

const code = spawnSync("pnpm", ["exec", "prisma", ...prismaArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(code.status ?? 1);
