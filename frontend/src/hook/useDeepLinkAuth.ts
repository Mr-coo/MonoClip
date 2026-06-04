import { useEffect } from "react";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";

import { exchangeOAuthCode } from "../utils/api";
import { useAuthStore } from "../store/auth.store";

/**
 * Captures the `monoclip://auth?code=...` deep link fired by the backend OAuth
 * callback, swaps the single-use code for an access token, and feeds it into the
 * auth store. Handles both the running-app case (onOpenUrl) and the cold-start
 * case (getCurrent).
 */
function extractCode(urls: string[] | null): string | null {
  if (!urls) return null;
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      const code = url.searchParams.get("code");
      if (code) return code;
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
      const code = extractCode(urls);
      if (!code) return;
      void exchangeOAuthCode(code)
        .then(({ access_token }) => setToken(access_token))
        .catch(() => {});
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
