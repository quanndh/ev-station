import http from "node:http";
import crypto from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import { URL } from "node:url";

import { prisma } from "@ev/db";

const PORT = Number(process.env.PORT ?? 9000);
const WS_PATH = process.env.WS_PATH ?? "/ocpp";
const API_KEY = process.env.OCPP_API_KEY ?? ""; // Next -> OCPP shared secret

type PendingRemoteStart = {
  sessionId: string;
  stationId: string;
};

// chargePointId => websocket
const wsByChargePointId = new Map<string, WebSocket>();

// chargePointId => pending remote start info
const pendingRemoteStart = new Map<string, PendingRemoteStart>();

// transactionId => sessionId (from CP StartTransaction)
const transactionIdBySessionId = new Map<string, string>();
const activeSessionByTransactionId = new Map<string, string>();

type PendingCall = {
  resolve: (value: any) => void;
  reject: (err: any) => void;
};

const pendingCallsByWs = new WeakMap<WebSocket, Map<string, PendingCall>>();

function getPendingCalls(ws: WebSocket) {
  let map = pendingCallsByWs.get(ws);
  if (!map) {
    map = new Map();
    pendingCallsByWs.set(ws, map);
  }
  return map;
}

function createUniqueId() {
  return crypto.randomBytes(8).toString("hex");
}

function jsonSend(ws: WebSocket, msg: unknown) {
  ws.send(JSON.stringify(msg));
}

function respondCall(ws: WebSocket, uniqueId: string, payload: any) {
  jsonSend(ws, [3, uniqueId, payload]);
}

function sendError(ws: WebSocket, uniqueId: string, errorCode: string, errorDescription: string, details: any = {}) {
  jsonSend(ws, [4, uniqueId, errorCode, errorDescription, details]);
}

function extractChargePointIdFromUpgrade(req: http.IncomingMessage) {
  const url = req.url ? new URL(req.url, "http://localhost") : null;
  const pathname = url?.pathname ?? "";

  // Expected: /ocpp/{chargePointId}
  if (pathname.startsWith(WS_PATH + "/")) {
    const cpId = decodeURIComponent(pathname.slice((WS_PATH + "/").length));
    if (cpId) return cpId;
  }

  // Fallback: use subprotocol header if charger sets it.
  const header = req.headers["sec-websocket-protocol"];
  return typeof header === "string" ? header : "unknown";
}

async function getEffectivePriceVndPerKwh(stationId: string) {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { defaultPriceVndPerKwh: true },
  });
  if (station?.defaultPriceVndPerKwh != null) return station.defaultPriceVndPerKwh;

  const global = await prisma.globalPricePolicy.findUnique({
    where: { id: 1 },
    select: { priceVndPerKwh: true },
  });
  return global?.priceVndPerKwh ?? 0;
}

function computeAmountVndFromKwh(kWh: number, priceVndPerKwh: number) {
  if (!Number.isFinite(kWh) || !Number.isFinite(priceVndPerKwh)) return 0;
  if (kWh <= 0) return 0;
  return Math.max(0, Math.floor(kWh * priceVndPerKwh));
}

function findEnergyKwhFromMeterValues(payload: any): number | null {
  // Expected structure:
  // { meterValue: [ { sampledValue: [ { measurand, unitOfMeasure, value } ] } ], transactionId, ... }
  const meterValues = payload?.meterValue;
  if (!Array.isArray(meterValues)) return null;

  for (const mv of meterValues) {
    const sampled = mv?.sampledValue;
    if (!Array.isArray(sampled)) continue;
    for (const sv of sampled) {
      const measurand = String(sv?.measurand ?? "");
      const unit = String(sv?.unitOfMeasure?.value ?? sv?.unitOfMeasure ?? "");
      const valueStr = String(sv?.value ?? "");
      if (!valueStr) continue;

      if (!measurand.includes("Energy.Active.Import.Register")) continue;

      const valueNum = Number(valueStr);
      if (!Number.isFinite(valueNum)) continue;

      if (unit === "Wh") return valueNum / 1000;
      if (unit === "kWh") return valueNum;

      // If unit missing, assume kWh (safer than Wh for UI, but can be wrong).
      return valueNum;
    }
  }

  return null;
}

function sendCall(ws: WebSocket, action: string, payload: any) {
  const uniqueId = createUniqueId();
  const pending = getPendingCalls(ws);

  const message = [2, uniqueId, action, payload];
  jsonSend(ws, message);

  return new Promise<any>((resolve, reject) => {
    pending.set(uniqueId, { resolve, reject });
  });
}

async function handleCallFromChargePoint({
  ws,
  chargePointId,
  uniqueId,
  action,
  payload,
}: {
  ws: WebSocket;
  chargePointId: string;
  uniqueId: string;
  action: string;
  payload: any;
}) {
  try {
    if (action === "BootNotification") {
      await prisma.station.update({
        where: { ocppChargePointId: chargePointId },
        data: { lastSeenAt: new Date() },
      }).catch(() => undefined);

      respondCall(ws, uniqueId, {
        status: "Accepted",
        currentTime: new Date().toISOString(),
        interval: 30,
      });
      return;
    }

    if (action === "Heartbeat") {
      respondCall(ws, uniqueId, { currentTime: new Date().toISOString() });
      return;
    }

    if (action === "StatusNotification") {
      const connectorId = payload?.connectorId ?? 1;
      void connectorId;

      await prisma.station.update({
        where: { ocppChargePointId: chargePointId },
        data: { lastSeenAt: new Date() },
      }).catch(() => undefined);

      respondCall(ws, uniqueId, {});
      return;
    }

    if (action === "StartTransaction") {
      const connectorId = payload?.connectorId ?? 1;
      void connectorId;

      const transactionId = String(payload?.transactionId ?? "");
      if (!transactionId) {
        respondCall(ws, uniqueId, {
          transactionId: 0,
          idTagInfo: { status: "Invalid" },
        });
        return;
      }

      const pending = pendingRemoteStart.get(chargePointId);
      if (pending) {
        pendingRemoteStart.delete(chargePointId);
        transactionIdBySessionId.set(pending.sessionId, transactionId);
        activeSessionByTransactionId.set(transactionId, pending.sessionId);
      }

      await prisma.station.update({
        where: { ocppChargePointId: chargePointId },
        data: { lastSeenAt: new Date() },
      }).catch(() => undefined);

      respondCall(ws, uniqueId, {
        transactionId,
        idTagInfo: { status: "Accepted" },
      });
      return;
    }

    if (action === "StopTransaction") {
      const transactionId = String(payload?.transactionId ?? "");
      const sessionId = activeSessionByTransactionId.get(transactionId);

      if (sessionId) {
        activeSessionByTransactionId.delete(transactionId);
        transactionIdBySessionId.delete(sessionId);
      }

      if (sessionId) {
        // CP can send meterStop, but to keep MVP simple, MeterValues will drive kWh updates.
        await prisma.chargingSession.update({
          where: { id: sessionId },
          data: {
            status: "completed",
            endedAt: new Date(),
            paymentStatus: "pending",
          },
        }).catch(() => undefined);
      }

      respondCall(ws, uniqueId, {
        transactionId: transactionId ? Number(transactionId) : 0,
        idTagInfo: { status: "Accepted" },
      });
      return;
    }

    if (action === "MeterValues") {
      const transactionId = String(payload?.transactionId ?? "");
      const sessionId = activeSessionByTransactionId.get(transactionId);
      if (sessionId) {
        const stationId = await prisma.chargingSession
          .findUnique({
            where: { id: sessionId },
            select: { stationId: true },
          })
          .then((s) => s?.stationId)
          .catch(() => undefined);

        const kWh = findEnergyKwhFromMeterValues(payload);
        if (stationId && kWh != null) {
          const priceVndPerKwh = await getEffectivePriceVndPerKwh(stationId);
          const amountVnd = computeAmountVndFromKwh(kWh, priceVndPerKwh);

          await prisma.chargingSession.update({
            where: { id: sessionId },
            data: { kWh, amountVnd },
          }).catch(() => undefined);

          await prisma.payment.updateMany({
            where: { sessionId },
            data: { amountVnd },
          }).catch(() => undefined);
        }
      }

      respondCall(ws, uniqueId, {});
      return;
    }

    // Unknown incoming call
    respondCall(ws, uniqueId, {});
  } catch (err: any) {
    sendError(ws, uniqueId, "InternalError", err?.message ?? "InternalError");
  }
}

// HTTP helper: read json
async function readJson(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw);
}

async function requireApiKey(req: http.IncomingMessage) {
  if (!API_KEY) return true;
  const header = req.headers["x-api-key"];
  if (!header || header !== API_KEY) {
    return false;
  }
  return true;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/remote/start") {
    const ok = await requireApiKey(req);
    if (!ok) {
      res.writeHead(401);
      res.end();
      return;
    }

    const body = (await readJson(req)) as { sessionId?: string; stationId?: string };
    const sessionId = body?.sessionId;
    const stationId = body?.stationId;

    if (!sessionId || !stationId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "sessionId and stationId required" }));
      return;
    }

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { ocppChargePointId: true },
    });
    if (!station) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Station not found" }));
      return;
    }

    const chargePointId = station.ocppChargePointId;
    const ws = wsByChargePointId.get(chargePointId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: "Charge point not connected" }));
      return;
    }

    pendingRemoteStart.set(chargePointId, { sessionId, stationId });

    // MVP: fixed connectorId=1 + constant idTag.
    const remoteStartPayload = { connectorId: 1, idTag: "EVGS" };
    await sendCall(ws, "RemoteStartTransaction", remoteStartPayload).catch(() => undefined);

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/remote/stop") {
    const ok = await requireApiKey(req);
    if (!ok) {
      res.writeHead(401);
      res.end();
      return;
    }

    const body = (await readJson(req)) as { sessionId?: string };
    const sessionId = body?.sessionId;
    if (!sessionId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "sessionId required" }));
      return;
    }

    const txId = transactionIdBySessionId.get(sessionId);
    if (!txId) {
      res.writeHead(409);
      res.end(JSON.stringify({ error: "No active OCPP transaction yet" }));
      return;
    }

    const chargingSession = await prisma.chargingSession.findUnique({
      where: { id: sessionId },
      select: { stationId: true },
    });
    if (!chargingSession) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }

    const station = await prisma.station.findUnique({
      where: { id: chargingSession.stationId },
      select: { ocppChargePointId: true },
    });

    if (!station) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Station not found" }));
      return;
    }

    const ws = wsByChargePointId.get(station.ocppChargePointId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: "Charge point not connected" }));
      return;
    }

    const remoteStopPayload = { transactionId: txId };
    await sendCall(ws, "RemoteStopTransaction", remoteStopPayload).catch(() => undefined);

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req: http.IncomingMessage, socket: any, head: Buffer) => {
  if (!req.url) return socket.destroy();
  if (!req.url.startsWith(WS_PATH)) return socket.destroy();

  wss.handleUpgrade(req, socket as any, head, (ws: WebSocket) => {
    wss.emit("connection", ws, req as any);
  });
});

wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
  const chargePointId = extractChargePointIdFromUpgrade(req);
  wsByChargePointId.set(chargePointId, ws);

  ws.on("message", (raw: WebSocket.RawData) => {
    const text = raw.toString();
    let msg: any;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }

    if (!Array.isArray(msg)) return;

    const msgType = msg[0];
    const uniqueId = String(msg[1]);

    // CALL from CP
    if (msgType === 2) {
      const action = msg[2];
      const payload = msg[3];
      void handleCallFromChargePoint({
        ws,
        chargePointId,
        uniqueId,
        action,
        payload,
      });
      return;
    }

    // RESPONSE to CSMS call
    if (msgType === 3) {
      const payload = msg[2];
      const pending = getPendingCalls(ws).get(uniqueId);
      if (pending) {
        pending.resolve(payload);
        getPendingCalls(ws).delete(uniqueId);
      }
      return;
    }

    // ERROR to CSMS call
    if (msgType === 4) {
      const errorDescription = msg[3];
      const pending = getPendingCalls(ws).get(uniqueId);
      if (pending) {
        pending.reject(new Error(String(errorDescription ?? "OCPP error")));
        getPendingCalls(ws).delete(uniqueId);
      }
      return;
    }
  });

  ws.on("close", () => {
    wsByChargePointId.delete(chargePointId);
  });
});

server.listen(PORT, () => {
  console.log(`OCPP CSMS listening on :${PORT} (ws path ${WS_PATH})`);
  console.log(`Remote endpoints: POST /remote/start, POST /remote/stop`);
});

