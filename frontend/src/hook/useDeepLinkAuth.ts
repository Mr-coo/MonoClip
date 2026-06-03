import { useEffect } from "react";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";

import { useAuthStore } from "../store/auth.store";

/**
 * Captures the `monoclip://auth?token=...` deep link fired by the backend OAuth
 * callback and feeds the token into the auth store. Handles both the running-app
 * case (onOpenUrl) and the cold-start case (getCurrent).
 */
function extractToken(urls: string[] | null): string | null {
  if (!urls) return null;
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      const token = url.searchParams.get("token");
      if (token) return token;
    } catch {
      /* not a parseable URL — skip */
    }
  }
  return null;
}

export function useDeepLinkAuth(): void {
  const setToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const handle = (urls: string[] | null) => {
      const token = extractToken(urls);
      if (token) void setToken(token).catch(() => {});
    };

    // Cold start: app launched by the deep link.
    getCurrent()
      .then((urls) => {
        if (!cancelled) handle(urls);
      })
      .catch(() => {});

    // Running app: deep link arrives while open.
    onOpenUrl((urls) => handle(urls))
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [setToken]);
}
