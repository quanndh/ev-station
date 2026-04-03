import QRCode from "qrcode";

export type GenerateStationQrPosterOptions = {
  /** URL mã QR */
  url: string;
  /** Tên thương hiệu / app */
  appName: string;
  /** Tên trạm (in đậm dưới QR) */
  stationName: string;
  /** Chiều ngang ảnh (px), đủ lớn để in */
  widthPx?: number;
};

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = words[0] ?? "";
  for (let i = 1; i < words.length; i++) {
    const w = words[i] ?? "";
    const test = `${line} ${w}`;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      lines.push(line);
      line = w;
    }
  }
  lines.push(line);
  return lines;
}

/**
 * Tạo PNG poster (in / dán trạm): nền gradient, tên app, tên trạm, QR giữa.
 * Chỉ chạy trong trình duyệt.
 */
export async function generateStationQrPosterBlob(
  opts: GenerateStationQrPosterOptions,
): Promise<Blob> {
  const W = opts.widthPx ?? 1800;
  const H = Math.round(W * 1.35);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được canvas 2D");

  const urlText = opts.url.trim();
  if (!urlText) throw new Error("URL trống");

  // Nền
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#071912");
  bg.addColorStop(0.35, "#123524");
  bg.addColorStop(0.55, "#1b4332");
  bg.addColorStop(0.62, "#dde5df");
  bg.addColorStop(1, "#f2efe8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Họa tiết mềm
  ctx.fillStyle = "rgba(201, 162, 39, 0.14)";
  ctx.beginPath();
  ctx.arc(W * 0.88, H * 0.06, W * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.beginPath();
  ctx.arc(W * 0.12, H * 0.92, W * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Viền vàng mảnh
  ctx.strokeStyle = "rgba(201, 162, 39, 0.45)";
  ctx.lineWidth = Math.max(2, Math.round(W * 0.0025));
  roundRectPath(ctx, W * 0.04, H * 0.028, W * 0.92, H * 0.944, W * 0.02);
  ctx.stroke();

  // App name
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const titleSize = Math.round(W * 0.052);
  ctx.font = `700 ${titleSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#f4f1ea";
  ctx.fillText(opts.appName, W / 2, H * 0.065);

  const subSize = Math.round(W * 0.023);
  ctx.font = `500 ${subSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(244, 241, 234, 0.82)";
  ctx.fillText("Trạm sạc xe điện  ·  Quét QR để bắt đầu", W / 2, H * 0.065 + titleSize * 1.15);

  const cardX = W * 0.11;
  const cardY = H * 0.185;
  const cardW = W * 0.78;
  const cardH = H * 0.64;
  const cardR = W * 0.025;

  ctx.save();
  ctx.shadowColor = "rgba(7, 25, 18, 0.22)";
  ctx.shadowBlur = W * 0.035;
  ctx.shadowOffsetY = H * 0.012;
  ctx.fillStyle = "#faf9f7";
  roundRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(18, 53, 36, 0.1)";
  ctx.lineWidth = 2;
  roundRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.stroke();

  const qrSize = Math.round(Math.min(cardW, cardH) * 0.48);
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, urlText, {
    width: qrSize,
    margin: 2,
    color: { dark: "#0a1f16", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  const qx = cardX + (cardW - qrSize) / 2;
  const qy = cardY + cardH * 0.09;
  ctx.fillStyle = "#ffffff";
  const pad = W * 0.018;
  roundRectPath(ctx, qx - pad, qy - pad, qrSize + pad * 2, qrSize + pad * 2, W * 0.014);
  ctx.fill();
  ctx.strokeStyle = "rgba(18, 53, 36, 0.08)";
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, qx - pad, qy - pad, qrSize + pad * 2, qrSize + pad * 2, W * 0.014);
  ctx.stroke();
  ctx.drawImage(qrCanvas, qx, qy, qrSize, qrSize);

  const stationY = qy + qrSize + H * 0.055;
  const stationFont = Math.round(W * 0.038);
  ctx.font = `700 ${stationFont}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "#0d2818";
  const maxTextW = cardW * 0.82;
  const lines = wrapLines(ctx, opts.stationName.trim() || "Trạm sạc", maxTextW);
  const lineGap = stationFont * 1.2;
  lines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, W / 2, stationY + i * lineGap);
  });

  // Không in "link trạm" (URL) để ảnh poster dễ in và đỡ rối.
  // Token/URL vẫn nằm trong QR code ở giữa.

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Không tạo được PNG"));
      },
      "image/png",
      1,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export function slugFromStationQrUrl(url: string): string {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/s\/([^/?#]+)/);
    return m?.[1] ? decodeURIComponent(m[1]) : "tram";
  } catch {
    return "tram";
  }
}
