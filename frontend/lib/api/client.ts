import { ApiError } from "./errors";

const DEFAULT_CSRF_COOKIE = "XSRF-TOKEN";
const SESSION_STORAGE_KEY = "journal.sessionId";

function apiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return value.replace(/\/$/, "");
}

function csrfCookieName(): string {
  return process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || DEFAULT_CSRF_COOKIE;
}

let memorySessionId: string | undefined;

export function getStoredSessionId(): string | undefined {
  if (memorySessionId) {
    return memorySessionId;
  }
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY)
      ?? window.localStorage.getItem(SESSION_STORAGE_KEY)
      ?? undefined;
  } catch {
    return undefined;
  }
}

export function setStoredSessionId(sessionId: string | null | undefined): void {
  memorySessionId = sessionId || undefined;
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (sessionId) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Site data can be blocked on HTTP; in-memory session still covers this visit.
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const encoded = document.cookie.split(";").map((part) => part.trim());
  for (const part of encoded) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    if (key === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return undefined;
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      status?: number;
      error?: string;
      message?: string;
      timestamp?: string;
    };
    return new ApiError(
      body.status ?? response.status,
      body.error ?? "request_failed",
      body.message ?? response.statusText,
      body.timestamp,
    );
  } catch {
    return new ApiError(response.status, "request_failed", response.statusText || "Request failed.");
  }
}

type RequestOptions = {
  method?: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
  json?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("X-Requested-With")) {
    headers.set("X-Requested-With", "XMLHttpRequest");
  }
  const sessionId = getStoredSessionId();
  if (sessionId && !headers.has("X-Auth-Session")) {
    headers.set("X-Auth-Session", sessionId);
  }
  if (sessionId && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${sessionId}`);
  }

  let body = options.body ?? null;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    await ensureCsrfCookie();
    const token = readCookie(csrfCookieName());
    if (token) {
      headers.set("X-XSRF-TOKEN", token);
      if (body instanceof FormData && !body.has("_csrf")) {
        body.append("_csrf", token);
      }
    }
  }

  if (body instanceof FormData) {
    headers.delete("Content-Type");
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body,
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function apiFileUrl(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

export async function ensureCsrfCookie(): Promise<void> {
  const headers = new Headers({ Accept: "application/json" });
  const sessionId = getStoredSessionId();
  if (sessionId) {
    headers.set("X-Auth-Session", sessionId);
    headers.set("Authorization", `Bearer ${sessionId}`);
  }
  await fetch(`${apiBaseUrl()}/api/health`, {
    method: "GET",
    credentials: "include",
    headers,
  });
}
