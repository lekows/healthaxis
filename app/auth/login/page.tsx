"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("oauth_error");
    if (oauthError) setError(`Erro ao entrar com provedor externo: ${oauthError}`);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setError("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.");
      } else {
        setError("E-mail ou senha incorretos.");
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleOAuth(provider: "google" | "apple") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0D0B" }}>
      <div className="w-full max-w-md px-8 py-10 rounded-2xl border border-white/10" style={{ background: "#161614" }}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">HealthAxis</h1>
          <p className="text-sm text-white/40 mt-1">Acesse sua conta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium text-black transition-opacity disabled:opacity-50"
            style={{ background: "#C8F04A" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-5 relative flex items-center">
          <div className="flex-1 border-t border-white/10" />
          <span className="mx-3 text-xs text-white/30">ou</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="w-full py-3 rounded-lg text-sm font-medium border border-white/10 transition-colors flex items-center justify-center gap-2.5 hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuth("apple")}
            className="w-full py-3 rounded-lg text-sm font-medium border border-white/10 transition-colors flex items-center justify-center gap-2.5 hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.29.07 2.19.78 2.95.75.96-.12 1.87-.78 3.22-.84 1.59.09 2.84.81 3.59 2.08-3.26 1.98-2.73 6.02.77 7.53-.56 1.46-1.32 2.87-2.53 4.34zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continuar com Apple
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Não tem conta?{" "}
          <Link href="/auth/signup" className="text-white/70 hover:text-white transition-colors">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
