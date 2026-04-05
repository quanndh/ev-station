"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { BlobBackground } from "@/components/ui/blob-background";
import { Container } from "@/components/ui/container";
import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { formatViDateTime } from "@/lib/formatVi";
import type { ChargingCheckoutJson } from "@/lib/chargingCheckout";
import { MSG_CONTACT_SUPPORT_CHARGING } from "@/lib/chargingEligibility";
import { getTokenSubject, jsonHeadersWithOptionalBearer } from "@/lib/authClient";
import { getOrCreateChargingDeviceId } from "@/lib/chargingDeviceId";

const STOP_KEY_STORAGE_PREFIX = "evgs_stop_";
const SESSION_OWNER_PREFIX = "evgs_session_owner_";

export type StationInfo = {
  id: string;
  slug: string;
  name: string;
};

export type ActiveSessionView = {
  id: string;
  userId: string;
  startedAt: string; // ISO
  kWh: number | null;
  amountVnd: number | null;
  paymentStatus: string;
  paymentReference: string | null;
  paymentMethod: string | null;
};

export type ChargingBlockReasonClient =
  | "user_disabled"
  | "station_disabled"
  | "owner_account_disabled"
  | null;

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  const hh = Math.floor(mm / 60);
  const remMm = mm % 60;
  if (hh > 0) return `${hh}h ${remMm}m`;
  return `${mm}m ${ss}s`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function PaymentQrBlock({
  reference,
  amountVnd,
  paymentStatus,
}: {
  reference: string;
  amountVnd: number;
  paymentStatus: string;
}) {
  const qrPayload = `EVGS|${reference}|${amountVnd}`;

  return (
    <div className="mt-5 rounded-[var(--radius-card)] border border-[color:var(--border)]/60 bg-white/50 p-4">
      <div className="font-semibold text-[color:var(--foreground)]">Thanh toán: QR chuyển khoản</div>
      <div className="mt-2 text-sm text-[color:var(--muted-foreground)]">
        Nội dung CK:{" "}
        <span className="font-mono text-[color:var(--accent-foreground)]">{reference}</span>
      </div>
      <div className="mt-1 text-sm text-[color:var(--muted-foreground)]">
        Số tiền: <strong className="text-[color:var(--foreground)]">{formatVnd(amountVnd)}</strong>
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <QRCodeCanvas value={qrPayload} size={168} />
        </div>
        <div className="text-sm text-[color:var(--muted-foreground)]">
          Trạng thái:{" "}
          <strong className="text-[color:var(--foreground)]">
            {paymentStatus === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
          </strong>
          <div className="mt-2 text-xs">Chủ trạm / admin sẽ xác nhận sau khi nhận được chuyển khoản.</div>
        </div>
      </div>
    </div>
  );
}

function ActivePaymentBlock({ activeSession }: { activeSession: ActiveSessionView }) {
  if (!activeSession.paymentReference) return null;
  return (
    <PaymentQrBlock
      reference={activeSession.paymentReference}
      amountVnd={activeSession.amountVnd ?? 0}
      paymentStatus={activeSession.paymentStatus}
    />
  );
}

function CompletedCheckoutModal({
  checkout,
  message,
  onDismiss,
}: {
  checkout: ChargingCheckoutJson;
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const titleId = "completed-checkout-title";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onDismiss}
      />
      <div
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.25rem] border border-[color:var(--border)]/60 bg-[color:var(--background)] shadow-lg sm:rounded-[var(--radius-card)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto p-5 sm:p-6">
          <h2 id={titleId} className="text-lg font-semibold text-[color:var(--foreground)]">
            Thanh toán sau khi sạc
          </h2>
          {message ? (
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{message}</p>
          ) : null}
          <div className="mt-4 grid gap-2 rounded-[var(--radius-card)] border border-[color:var(--border)]/60 bg-white/50 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[color:var(--muted-foreground)]">Bắt đầu</span>
              <span className="font-medium">{formatViDateTime(checkout.session.startedAt)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[color:var(--muted-foreground)]">Kết thúc</span>
              <span className="font-medium">{formatViDateTime(checkout.session.endedAt)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[color:var(--muted-foreground)]">Điện năng</span>
              <span className="font-medium">
                {checkout.session.kWh != null ? `${checkout.session.kWh} kWh` : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[color:var(--muted-foreground)]">Thành tiền</span>
              <span className="font-semibold">{formatVnd(checkout.session.amountVnd ?? 0)}</span>
            </div>
          </div>
          {checkout.payment ? (
            <PaymentQrBlock
              reference={checkout.payment.reference}
              amountVnd={checkout.payment.amountVnd}
              paymentStatus={checkout.payment.status}
            />
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onDismiss}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChargingPanel({
  station,
  initialChargingBlocked,
  initialChargingBlockReason,
  initialPriceVndPerKwh,
  lastSeenAt: initialLastSeenAt,
  initialActiveSession,
}: {
  station: StationInfo;
  initialChargingBlocked: boolean;
  initialChargingBlockReason: ChargingBlockReasonClient;
  initialPriceVndPerKwh: number;
  lastSeenAt: string | null;
  initialActiveSession: ActiveSessionView | null;
}) {
  const [activeSession, setActiveSession] = useState<ActiveSessionView | null>(initialActiveSession);
  const [chargingBlocked, setChargingBlocked] = useState(initialChargingBlocked);
  const [chargingBlockReason, setChargingBlockReason] = useState<ChargingBlockReasonClient>(
    initialChargingBlockReason,
  );
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [priceVndPerKwh, setPriceVndPerKwh] = useState(initialPriceVndPerKwh);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(initialLastSeenAt);
  const [completedCheckout, setCompletedCheckout] = useState<ChargingCheckoutJson | null>(null);
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);
  const [stopWaitHint, setStopWaitHint] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [clientStopKey, setClientStopKey] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const deviceId = getOrCreateChargingDeviceId();
    if (!deviceId) return;
    void fetch("/api/charging/device", {
      method: "POST",
      headers: jsonHeadersWithOptionalBearer(),
      body: JSON.stringify({ deviceId }),
    });
  }, []);

  useEffect(() => {
    if (!activeSession?.id) {
      setClientStopKey(null);
      return;
    }
    const k = sessionStorage.getItem(`${STOP_KEY_STORAGE_PREFIX}${activeSession.id}`);
    setClientStopKey(k);
  }, [activeSession?.id]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/stations/${station.id}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.priceVndPerKwh === "number") {
          setPriceVndPerKwh(data.priceVndPerKwh);
        }
        if (typeof data.chargingBlocked === "boolean") {
          setChargingBlocked(data.chargingBlocked);
        }
        if (data.chargingBlockReason !== undefined) {
          setChargingBlockReason(data.chargingBlockReason as ChargingBlockReasonClient);
        }
        if (data.station?.lastSeenAt !== undefined) {
          setLastSeenAt(data.station.lastSeenAt);
        }
        if (data.status === "available") {
          setActiveSession(null);
          setClientStopKey(null);
          return;
        }
        if (data.activeSession) {
          setActiveSession({
            id: data.activeSession.id,
            userId: data.activeSession.userId,
            startedAt:
              typeof data.activeSession.startedAt === "string"
                ? data.activeSession.startedAt
                : new Date(data.activeSession.startedAt).toISOString(),
            kWh: data.activeSession.kWh,
            amountVnd: data.activeSession.amountVnd,
            paymentStatus: data.activeSession.paymentStatus,
            paymentReference: data.activeSession.paymentReference,
            paymentMethod: data.activeSession.paymentMethod,
          });
        }
      } catch {
        // ignore
      }
    };

    if (activeSession) {
      setPolling(true);
      void poll();
      timer = setInterval(poll, 2500);
    } else {
      setPolling(false);
      void poll();
      timer = setInterval(poll, 8000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station.id, activeSession?.id]);

  const duration = useMemo(() => {
    if (!activeSession?.startedAt) return null;
    return formatDuration(now - new Date(activeSession.startedAt).getTime());
  }, [now, activeSession?.startedAt]);

  const ocppHint = useMemo(() => {
    if (!lastSeenAt) return "Chưa có tín hiệu trạm.";
    return `Online: ${formatViDateTime(lastSeenAt)}`;
  }, [lastSeenAt]);

  const chargingBlockedHint = useMemo(() => {
    if (!chargingBlocked) return null;
    return "Trạm không nhận sạc mới.";
  }, [chargingBlocked]);

  async function startCharging() {
    setError(null);
    const res = await fetch("/api/charging/start", {
      method: "POST",
      headers: jsonHeadersWithOptionalBearer(),
      body: JSON.stringify({
        stationId: station.id,
        deviceId: getOrCreateChargingDeviceId(),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.errorCode === "user_charging_disabled") {
        setError(MSG_CONTACT_SUPPORT_CHARGING);
        return;
      }
      if (
        data.errorCode === "station_charging_disabled" ||
        data.errorCode === "owner_account_station_blocked"
      ) {
        setError(MSG_CONTACT_SUPPORT_CHARGING);
        return;
      }
      const hint = typeof data.hint === "string" ? data.hint : "";
      setError([data.error ?? "Không thể bắt đầu sạc", hint].filter(Boolean).join(" — "));
      return;
    }
    const data = await res.json();
    if (typeof data.priceVndPerKwh === "number") setPriceVndPerKwh(data.priceVndPerKwh);
    if (typeof data.stopKey === "string" && typeof data.sessionId === "string") {
      sessionStorage.setItem(`${STOP_KEY_STORAGE_PREFIX}${data.sessionId}`, data.stopKey);
      setClientStopKey(data.stopKey);
    }
    if (typeof data.actorUserId === "string" && typeof data.sessionId === "string") {
      sessionStorage.setItem(`${SESSION_OWNER_PREFIX}${data.sessionId}`, data.actorUserId);
    }

    const statusRes = await fetch(`/api/stations/${station.id}/status`, {
      cache: "no-store",
    });
    if (statusRes.ok) {
      const status = await statusRes.json();
      if (status.activeSession) {
        setActiveSession({
          id: status.activeSession.id,
          userId: status.activeSession.userId,
          startedAt:
            typeof status.activeSession.startedAt === "string"
              ? status.activeSession.startedAt
              : new Date(status.activeSession.startedAt).toISOString(),
          kWh: status.activeSession.kWh,
          amountVnd: status.activeSession.amountVnd,
          paymentStatus: status.activeSession.paymentStatus,
          paymentReference: status.activeSession.paymentReference,
          paymentMethod: status.activeSession.paymentMethod,
        });
      }
    }
  }

  async function stopCharging() {
    if (!activeSession) return;
    const sk =
      clientStopKey ??
      sessionStorage.getItem(`${STOP_KEY_STORAGE_PREFIX}${activeSession.id}`);
    if (!sk?.trim()) {
      setError(
        "Thiếu mã kết thúc phiên. Chỉ thiết bị đã bấm «Bắt đầu sạc» (và chưa xóa dữ liệu trình duyệt) mới dừng được. Hoặc liên hệ chủ trạm.",
      );
      return;
    }
    setError(null);
    setStopping(true);
    setStopWaitHint(null);
    try {
      const res = await fetch("/api/charging/stop", {
        method: "POST",
        headers: jsonHeadersWithOptionalBearer(),
        body: JSON.stringify({
          sessionId: activeSession.id,
          stopKey: sk.trim(),
          deviceId: getOrCreateChargingDeviceId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Không thể dừng sạc");
        return;
      }

      if (data.checkout) {
        setCompletedCheckout(data.checkout as ChargingCheckoutJson);
        setCompletedMessage(
          typeof data.message === "string"
            ? data.message
            : "Phiên sạc đã kết thúc. Vui lòng hoàn tất thanh toán.",
        );
        sessionStorage.removeItem(`${STOP_KEY_STORAGE_PREFIX}${activeSession.id}`);
        sessionStorage.removeItem(`${SESSION_OWNER_PREFIX}${activeSession.id}`);
        setClientStopKey(null);
        setActiveSession(null);
        return;
      }

      if (data.awaitingCompletion && data.sessionId) {
        setStopWaitHint(
          typeof data.message === "string" ? data.message : "Đang chờ trạm xác nhận dừng…",
        );
        for (let i = 0; i < 45; i++) {
          await sleep(1000);
          const r = await fetch(
            `/api/charging/sessions/${data.sessionId}/checkout?key=${encodeURIComponent(sk.trim())}`,
            { cache: "no-store" },
          );
          if (!r.ok) continue;
          const c = (await r.json()) as ChargingCheckoutJson;
          if (c.session?.status === "completed") {
            setCompletedCheckout(c);
            setCompletedMessage(
              "Đã kết thúc phiên sạc. Vui lòng thanh toán theo hướng dẫn bên dưới.",
            );
            sessionStorage.removeItem(`${STOP_KEY_STORAGE_PREFIX}${data.sessionId}`);
            sessionStorage.removeItem(`${SESSION_OWNER_PREFIX}${data.sessionId}`);
            setClientStopKey(null);
            setActiveSession(null);
            setStopWaitHint(null);
            return;
          }
        }
        setStopWaitHint("Quá lâu chưa nhận xác nhận từ trạm. Thử tải lại trang hoặc liên hệ chủ trạm.");
      }
    } finally {
      setStopping(false);
    }
  }

  const statusText = activeSession ? "Đang sạc" : "Rảnh";
  const sessionOwnerStored =
    typeof window !== "undefined" && activeSession
      ? sessionStorage.getItem(`${SESSION_OWNER_PREFIX}${activeSession.id}`)
      : null;
  const tokenSub = typeof window !== "undefined" ? getTokenSubject() : null;
  const sessionActorMatches =
    !!activeSession &&
    ((sessionOwnerStored != null && sessionOwnerStored === activeSession.userId) ||
      (tokenSub != null && tokenSub === activeSession.userId));
  const canStop = !!clientStopKey?.trim() && sessionActorMatches;

  const dismissCompletedCheckout = useCallback(() => {
    setCompletedCheckout(null);
    setCompletedMessage(null);
  }, []);

  return (
    <BlobBackground>
      {completedCheckout ? (
        <CompletedCheckoutModal
          checkout={completedCheckout}
          message={completedMessage}
          onDismiss={dismissCompletedCheckout}
        />
      ) : null}
      <SiteHeader />
      <main className="flex flex-1 flex-col py-8 sm:py-12">
        <Container className="max-w-4xl">
          <Card className="rounded-tl-[4rem]">
            <CardTitle>{station.name}</CardTitle>
            <CardMuted>
              <span className="font-mono">{station.slug}</span>
            </CardMuted>

            <div className="mt-5 grid gap-3 rounded-[var(--radius-card)] border border-[color:var(--border)]/60 bg-white/50 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[color:var(--muted-foreground)]">Trạng thái</span>
                <span className="font-semibold text-[color:var(--foreground)]">
                  {statusText}
                  {polling ? " · đang cập nhật" : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[color:var(--muted-foreground)]">Đơn giá</span>
                <span className="font-semibold">{formatVnd(priceVndPerKwh)} / kWh</span>
              </div>
              <div className="text-xs text-[color:var(--muted-foreground)]">{ocppHint}</div>
            </div>

            {activeSession ? (
              <div className="mt-6 grid gap-4">
                {sessionActorMatches ? (
                  <>
                    <div className="grid gap-2 rounded-[var(--radius-card)] border border-[color:var(--border)]/60 bg-white/50 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[color:var(--muted-foreground)]">Bắt đầu sạc</span>
                        <span className="font-semibold">{formatViDateTime(activeSession.startedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[color:var(--muted-foreground)]">Thời gian đã sạc</span>
                        <span className="font-semibold">{duration ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[color:var(--muted-foreground)]">Đơn giá</span>
                        <span className="font-semibold">{formatVnd(priceVndPerKwh)} / kWh</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[color:var(--muted-foreground)]">Điện năng</span>
                        <span className="font-semibold">
                          {activeSession.kWh != null ? `${activeSession.kWh} kWh` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[color:var(--muted-foreground)]">Tiền tạm tính</span>
                        <span className="font-semibold">
                          {activeSession.amountVnd != null ? formatVnd(activeSession.amountVnd) : formatVnd(0)}
                        </span>
                      </div>
                    </div>

                    <ActivePaymentBlock activeSession={activeSession} />

                    <div className="mt-2 flex flex-col gap-2">
                      {!canStop ? (
                        <p className="text-sm text-[color:var(--muted-foreground)]">
                          Trạm đang có phiên sạc nhưng thiết bị này không thể kết thúc phiên ở đây (phiên do tài khoản
                          hoặc thiết bị khác bắt đầu, hoặc đã mất mã kết thúc / dữ liệu trình duyệt). Chỉ đúng người
                          đã bấm «Bắt đầu sạc» trên cùng thiết bị mới dừng được.
                        </p>
                      ) : null}
                      <Button onClick={stopCharging} size="lg" disabled={stopping || !canStop}>
                        {stopping ? "Đang xử lý…" : "Kết thúc sạc"}
                      </Button>
                      {stopWaitHint ? (
                        <p className="text-sm text-[color:var(--muted-foreground)]">{stopWaitHint}</p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="rounded-[var(--radius-card)] border border-[color:var(--border)]/60 bg-white/50 p-4 text-sm">
                    <p className="text-[color:var(--muted-foreground)]">
                      Trạm đang có phiên sạc do tài khoản hoặc thiết bị khác bắt đầu. Thiết bị này chỉ xem được thông
                      tin cơ bản và không thể theo dõi chi tiết hay kết thúc phiên.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <div className="rounded-[var(--radius-card)] border border-[color:var(--border)]/60 bg-white/50 p-5">
                  {chargingBlocked ? (
                    <>
                      <p className="font-medium text-[color:var(--foreground)]">
                        Hiện không thể bắt đầu sạc tại trạm này.
                      </p>
                      <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                        {chargingBlockedHint}
                      </p>
                      <div className="mt-4">
                        <Button type="button" size="lg" disabled>
                          Bắt đầu sạc
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[color:var(--muted-foreground)]">
                        Kiểm tra thông tin trạm ở trên, sau đó bắt đầu phiên sạc. Thời điểm bắt đầu và số
                        tiền sẽ được lưu trên hệ thống.
                      </p>
                      <div className="mt-4">
                        <Button onClick={startCharging} size="lg">
                          Bắt đầu sạc
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {error ? (
              <div className="mt-5 rounded-[var(--radius-card)] border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 p-4 text-sm">
                Lỗi: {error}
              </div>
            ) : null}
          </Card>
        </Container>
      </main>
    </BlobBackground>
  );
}
