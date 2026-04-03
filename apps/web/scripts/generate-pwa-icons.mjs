/**
 * Tạo PNG PWA từ public/brand/logo-mark.svg (chạy sau khi sửa logo).
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const brandDir = path.join(webRoot, "public/brand");
const svgPath = path.join(brandDir, "logo-mark.svg");

const GREEN = { r: 93, g: 112, b: 82, alpha: 1 }; // #5d7052

async function main() {
  const svgInput = sharp(svgPath);

  await svgInput
    .clone()
    .resize(192, 192)
    .png()
    .toFile(path.join(brandDir, "pwa-icon-192.png"));

  await svgInput
    .clone()
    .resize(512, 512)
    .png()
    .toFile(path.join(brandDir, "pwa-icon-512.png"));

  // Maskable: nội dung ~72% cạnh, căn giữa (an toàn vùng tròn cắt Android).
  const canvas = 512;
  const inner = Math.round(canvas * 0.72);
  const innerBuf = await sharp(svgPath).resize(inner, inner).png().toBuffer();
  const left = Math.floor((canvas - inner) / 2);
  const top = Math.floor((canvas - inner) / 2);

  await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: GREEN,
    },
  })
    .composite([{ input: innerBuf, left, top }])
    .png()
    .toFile(path.join(brandDir, "pwa-icon-maskable-512.png"));

  console.log("Wrote public/brand/pwa-icon-192.png, pwa-icon-512.png, pwa-icon-maskable-512.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
