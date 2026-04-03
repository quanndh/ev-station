const OCPP_BASE_URL =
  process.env.OCPP_SERVICE_URL?.replace(/\/$/, "") ?? "http://localhost:9000";
const OCPP_API_KEY = process.env.OCPP_API_KEY ?? "";

async function callOcpp(path: string, body: any) {
  const res = await fetch(`${OCPP_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(OCPP_API_KEY ? { "x-api-key": OCPP_API_KEY } : {}),
    },
    body: JSON.stringify(body),
    // Server-side route: no caching
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `OCPP ${path} failed (${res.status})`);
  }

  return res.json().catch(() => ({}));
}

export async function remoteStart({ sessionId, stationId }: { sessionId: string; stationId: string }) {
  await callOcpp("/remote/start", { sessionId, stationId });
}

export async function remoteStop({ sessionId }: { sessionId: string }) {
  await callOcpp("/remote/stop", { sessionId });
}

