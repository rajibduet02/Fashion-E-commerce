import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { validateTryOnBody } from "./validate.mjs";

loadEnv(".env");

const PORT = Number(process.env.TRYON_PORT || 8787);
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 8;
const hits = new Map();
const inflight = new Map();

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] == null) process.env[key] = value;
  }
}

function coded(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function allow(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 9 * 1024 * 1024) throw coded("PAYLOAD_TOO_LARGE", "The upload is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw coded("BAD_JSON", "The request body is not valid JSON.");
  }
}

async function runFashn({ person, garment, category, signal }) {
  const key = process.env.FASHN_API_KEY;
  if (!key) {
    throw coded("TRYON_PROVIDER_UNCONFIGURED", "No virtual try-on provider is configured. Set FASHN_API_KEY on the server. The live mirror still runs on this device.");
  }
  const mode = process.env.TRYON_FASHN_MODE === "performance" ? "performance" : "quality";
  const submitted = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model_name: "tryon-v1.6",
      inputs: {
        model_image: person,
        garment_image: garment,
        category,
        garment_photo_type: "model",
        mode,
      },
    }),
    signal,
  });
  const started = await submitted.json().catch(() => ({}));
  if (!submitted.ok || !started.id) {
    const detail = started?.error?.message || started?.message || submitted.statusText;
    throw coded("TRYON_PROVIDER_REJECTED", `The try-on provider rejected the request. ${detail}`.trim());
  }
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (signal.aborted) throw coded("ABORTED", "The request was cancelled.");
    const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${started.id}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal,
    });
    const status = await statusResponse.json().catch(() => ({}));
    if (status.status === "completed" && Array.isArray(status.output) && status.output[0]) return status.output[0];
    if (status.status === "failed") {
      throw coded("TRYON_PROVIDER_FAILED", status.error?.message || "The try-on provider failed to generate an image.");
    }
  }
  throw coded("TRYON_TIMEOUT", "The try-on provider did not finish in time. Try the capture again.");
}

const providers = { fashn: runFashn };

async function generate(input, signal) {
  const name = (process.env.TRYON_PROVIDER || "fashn").toLowerCase();
  if (name === "none") {
    throw coded("TRYON_PROVIDER_UNCONFIGURED", "Virtual try-on is turned off. Set TRYON_PROVIDER=fashn and FASHN_API_KEY to enable captured-image generation.");
  }
  const run = providers[name];
  if (!run) throw coded("TRYON_PROVIDER_UNKNOWN", `Unknown try-on provider: ${name}.`);
  const remote = await run({ ...input, signal });
  const image = await fetch(remote, { signal });
  if (!image.ok) throw coded("TRYON_RESULT_UNAVAILABLE", "The provider finished, but the image could not be retrieved.");
  const type = image.headers.get("content-type") || "image/png";
  const bytes = Buffer.from(await image.arrayBuffer());
  return `data:${type};base64,${bytes.toString("base64")}`;
}

function send(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  if (request.url !== "/api/try-on") {
    send(response, 404, { error: "Not found." });
    return;
  }
  if (request.method !== "POST") {
    send(response, 405, { error: "Use POST." });
    return;
  }
  const ip = request.socket.remoteAddress || "local";
  if (!allow(ip)) {
    send(response, 429, { code: "RATE_LIMITED", error: "Too many try-on requests. Wait a few minutes and try again." });
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 65_000);
  request.on("close", () => controller.abort());
  try {
    const parsed = validateTryOnBody(await readJson(request));
    if (parsed.error) {
      send(response, 400, { error: parsed.error });
      return;
    }
    const key = createHash("sha256").update(parsed.value.person).update(parsed.value.garment).update(parsed.value.category).digest("hex");
    const task = inflight.get(key) ?? generate(parsed.value, controller.signal).finally(() => inflight.delete(key));
    inflight.set(key, task);
    const image = await task;
    send(response, 200, { image });
    console.log(`try-on completed category=${parsed.value.category}`);
  } catch (error) {
    const code = error.code || (error.name === "AbortError" ? "TRYON_TIMEOUT" : "TRYON_FAILED");
    const status = code === "TRYON_PROVIDER_UNCONFIGURED" ? 503 : code === "PAYLOAD_TOO_LARGE" || code === "BAD_JSON" ? 400 : 502;
    console.log(`try-on failed code=${code}`);
    if (!response.headersSent) send(response, status, { code, error: error.message || "The try-on request failed." });
  } finally {
    clearTimeout(timer);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const configured = Boolean(process.env.FASHN_API_KEY) && (process.env.TRYON_PROVIDER || "fashn") !== "none";
  console.log(`Try-on API on http://127.0.0.1:${PORT} provider=${configured ? "fashn" : "unconfigured"}`);
});
