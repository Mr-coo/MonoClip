import { FormEvent, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

import { useAuthStore } from "../../store/auth.store";
import { OAuthProvider } from "../../utils/api";

type Mode = "login" | "register";

export default function AuthScreen() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loginWithProvider = useAuthStore((s) => s.loginWithProvider);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, fullName || undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: OAuthProvider) => {
    setError(null);
    try {
      await loginWithProvider(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the browser.");
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
  };

  return (
    <main className="w-screen h-screen bg-dark text-typography flex items-center justify-center">
      <div className="w-[380px] bg-base rounded-2xl shadow-lg shadow-black p-8 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-1">
          <img src="/logo.png" alt="MonoClip" className="h-12 w-12 mb-1" />
          <h1 className="text-xl font-semibold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-typography/60">
            {mode === "login"
              ? "Sign in to continue to MonoClip"
              : "Sign up to start editing with MonoClip"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => oauth("google")}
            className="flex items-center justify-center gap-2 border border-shadow bg-mid p-2.5 rounded-xl hover:bg-shadow/40 transition-all duration-200"
          >
            <FcGoogle size={20} /> Continue with Google
          </button>
          <button
            type="button"
            onClick={() => oauth("github")}
            className="flex items-center justify-center gap-2 border border-shadow bg-mid p-2.5 rounded-xl hover:bg-shadow/40 transition-all duration-200"
          >
            <FaGithub size={20} /> Continue with GitHub
          </button>
        </div>

        <div className="flex items-center gap-3 text-typography/40 text-xs">
          <span className="h-px flex-1 bg-shadow/50" />
          OR
          <span className="h-px flex-1 bg-shadow/50" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Full name (optional)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-mid border border-shadow rounded-xl p-2.5 outline-none focus:border-constrast transition-colors"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-mid border border-shadow rounded-xl p-2.5 outline-none focus:border-constrast transition-colors"
          />
          <input
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            placeholder={mode === "register" ? "Password (min 8 characters)" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-mid border border-shadow rounded-xl p-2.5 outline-none focus:border-constrast transition-colors"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="bg-primary text-typography p-2.5 rounded-xl shadow-lg shadow-black hover:bg-shadow hover:shadow-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-center text-typography/60">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="text-constrast hover:underline"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
