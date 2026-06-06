// Route HTTP through Tauri's Rust side (reqwest) instead of the WebView2 network
// stack. Recent WebView2/Chromium versions block page requests to loopback
// addresses (Local Network Access), which surfaces as net::ERR_EMPTY_RESPONSE and
// never reaches the backend. The plugin's fetch is API-compatible with the web one.
import { fetch } from "@tauri-apps/plugin-http";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

// Kept in sync with TOKEN_KEY in store/auth.store.ts. Read from storage rather
// than importing the store to avoid a circular import (the store imports this).
const TOKEN_KEY = "monoclip.token";

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function hasStoredToken(): boolean {
  try {
    return localStorage.getItem(TOKEN_KEY) !== null;
  } catch {
    return false;
  }
}

// Notified when the backend rejects our credentials (401/403) on a request we
// sent a token with — i.e. the session expired or was revoked. The auth store
// registers a handler that drops the session so the app routes back to login.
// Kept as a callback (rather than importing the store) to avoid a circular
// import: the store already imports this module.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export interface CaptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResponse {
  language: string;
  segments: CaptionSegment[];
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TrackFrame {
  frame_index: number;
  timestamp: number;
  bbox: BBox;
  success: boolean;
}

export interface TrackingResponse {
  output_video_path: string;
  frames: TrackFrame[];
}

interface ValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

interface ApiErrorBody {
  detail?: string | ValidationItem[];
}

// FastAPI returns `detail` as a plain string for our own HTTPExceptions, but as
// an array of {loc, msg} items for 422 request-validation errors. Flatten both
// into one readable sentence so the UI never shows "[object Object]".
function errorMessage(body: ApiErrorBody, status: number): string {
  const { detail } = body;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        const field = item.loc?.[item.loc.length - 1];
        const msg = item.msg ?? "Invalid value";
        return typeof field === "string" && field !== "body"
          ? `${field}: ${msg}`
          : msg;
      })
      .join("; ");
  }
  return `HTTP ${status}`;
}

async function checkResponse(res: Response): Promise<void> {
  if (!res.ok) {
    // A 401/403 while we hold a token means it's no longer accepted: drop the
    // session so the UI falls back to the login screen. Skipped when no token is
    // stored, so a failed login/register (also 401) doesn't self-trigger this.
    if ((res.status === 401 || res.status === 403) && hasStoredToken()) {
      onUnauthorized?.();
    }
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(errorMessage(body, res.status));
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type OAuthProvider = "google" | "github";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  provider: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export function oauthLoginUrl(provider: OAuthProvider): string {
  return `${API_BASE}/auth/${provider}/login`;
}

export interface RegisterStartResponse {
  email: string;
  detail: string;
}

// Step 1 of signup: validates and emails a verification code. No token yet —
// the account is created only after the code is confirmed via verifyRegistration.
export async function startRegistration(
  email: string,
  password: string,
  fullName?: string,
): Promise<RegisterStartResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName || null }),
  });
  await checkResponse(res);
  return res.json() as Promise<RegisterStartResponse>;
}

// Step 2 of signup: confirm the emailed 6-digit code, creating the account and
// returning an access token.
export async function verifyRegistration(
  email: string,
  code: string,
): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/register/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  await checkResponse(res);
  return res.json() as Promise<TokenResponse>;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await checkResponse(res);
  return res.json() as Promise<TokenResponse>;
}

export async function exchangeOAuthCode(code: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  await checkResponse(res);
  return res.json() as Promise<TokenResponse>;
}

export async function getMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await checkResponse(res);
  return res.json() as Promise<AuthUser>;
}

export async function transcribe(file: File): Promise<TranscriptionResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/transcribe`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  await checkResponse(res);
  return res.json() as Promise<TranscriptionResponse>;
}

export async function filterBadwords(
  payload: TranscriptionResponse,
): Promise<TranscriptionResponse> {
  const res = await fetch(`${API_BASE}/caption/filter`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  await checkResponse(res);
  return res.json() as Promise<TranscriptionResponse>;
}

export interface TranslationTarget {
  code: string;
  name: string;
}

export async function listTranslationTargets(): Promise<TranslationTarget[]> {
  const res = await fetch(`${API_BASE}/caption/translate/languages`, {
    headers: authHeaders(),
  });
  await checkResponse(res);
  const body = (await res.json()) as { targets: TranslationTarget[] };
  return body.targets;
}

export async function translateCaptions(payload: {
  source_lang: string;
  target_lang: string;
  segments: CaptionSegment[];
}): Promise<TranscriptionResponse> {
  const res = await fetch(`${API_BASE}/caption/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  await checkResponse(res);
  return res.json() as Promise<TranscriptionResponse>;
}

export interface BgRemoveResponse {
  output_path: string;
  media_kind: "img" | "video";
  filename: string;
}

export async function removeBackground(file: File): Promise<BgRemoveResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/bgremove`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  await checkResponse(res);
  return res.json() as Promise<BgRemoveResponse>;
}

export async function trackObject(
  file: File,
  x: number,
  y: number,
  w: number,
  h: number,
  zoomFactor = 1.5,
): Promise<TrackingResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("x", String(x));
  form.append("y", String(y));
  form.append("w", String(w));
  form.append("h", String(h));
  form.append("zoom_factor", String(zoomFactor));
  const res = await fetch(`${API_BASE}/track`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  await checkResponse(res);
  return res.json() as Promise<TrackingResponse>;
}
