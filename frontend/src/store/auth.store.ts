import { create } from "zustand";
import { openUrl } from "@tauri-apps/plugin-opener";

import {
  AuthUser,
  OAuthProvider,
  getMe,
  loginUser,
  oauthLoginUrl,
  registerUser,
} from "../utils/api";

const TOKEN_KEY = "monoclip.token";

type AuthStatus = "loading" | "authed" | "guest";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  status: AuthStatus;

  bootstrap: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  loginWithProvider: (provider: OAuthProvider) => Promise<void>;
  logout: () => void;
}

function persistToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage unavailable — token stays in-memory only */
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  status: "loading",

  bootstrap: async () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(TOKEN_KEY);
    } catch {
      stored = null;
    }
    if (!stored) {
      set({ status: "guest", token: null, user: null });
      return;
    }
    try {
      const user = await getMe(stored);
      set({ token: stored, user, status: "authed" });
    } catch {
      persistToken(null);
      set({ token: null, user: null, status: "guest" });
    }
  },

  setToken: async (token: string) => {
    persistToken(token);
    set({ token, status: "loading" });
    try {
      const user = await getMe(token);
      set({ user, status: "authed" });
    } catch (err) {
      persistToken(null);
      set({ token: null, user: null, status: "guest" });
      throw err;
    }
  },

  login: async (email, password) => {
    const { access_token } = await loginUser(email, password);
    await get().setToken(access_token);
  },

  register: async (email, password, fullName) => {
    const { access_token } = await registerUser(email, password, fullName);
    await get().setToken(access_token);
  },

  loginWithProvider: async (provider) => {
    await openUrl(oauthLoginUrl(provider));
  },

  logout: () => {
    persistToken(null);
    set({ token: null, user: null, status: "guest" });
  },
}));
