"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = Extract<Provider, "google" | "azure">;

const oauthProviders: { provider: OAuthProvider; label: string }[] = [
  { provider: "google", label: "Continuar com Google" },
  { provider: "azure", label: "Continuar com Microsoft" },
];

function translateAuthError(msg: string): string {
  if (msg.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("rate limit")) return "Muitas tentativas. Tente novamente em alguns minutos.";
  return msg;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <span className="grid grid-cols-2 gap-0.5 w-4 h-4" aria-hidden="true">
      <span style={{ background: "#F25022" }} />
      <span style={{ background: "#7FBA00" }} />
      <span style={{ background: "#00A4EF" }} />
      <span style={{ background: "#FFB900" }} />
    </span>
  );
}

function OAuthIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") return <GoogleIcon />;
  return <MicrosoftIcon />;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("oauth_error");
    if (oauthError) setError(`Erro ao entrar com provedor externo: ${oauthError}`);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setError("");
    setMagicLinkSent(false);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error || !data.user) {
      setError(error ? translateAuthError(error.message) : "E-mail ou senha incorretos.");
      setPasswordLoading(false);
      return;
    }

    // A decisão de papel é resolvida no servidor (/auth/post-login) para não
    // depender de queries no client, que podiam pendurar o botão "Entrando...".
    router.replace("/auth/post-login");
  }

  async function handleMagicLink() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Informe seu e-mail para receber o link de acesso.");
      return;
    }

    setMagicLinkLoading(true);
    setError("");
    setMagicLinkSent(false);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(translateAuthError(error.message));
      setMagicLinkLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setMagicLinkLoading(false);
  }

  async function handleOAuth(provider: OAuthProvider) {
    setOauthLoading(provider);
    setError("");
    setMagicLinkSent(false);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });

    if (error) {
      setError(translateAuthError(error.message));
      setOauthLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0D0B" }}>
      <div className="w-full max-w-md px-8 py-10 rounded-2xl border border-white/10" style={{ background: "#161614" }}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">HealthAxis</h1>
          <p className="text-sm text-white/40 mt-1">Acesse ou crie sua conta</p>
        </div>

        <div className="space-y-3">
          {oauthProviders.map(({ provider, label }) => (
            <button
              key={provider}
              type="button"
              onClick={() => handleOAuth(provider)}
              disabled={Boolean(oauthLoading)}
              className="w-full py-3 rounded-lg text-sm font-medium border border-white/10 transition-colors flex items-center justify-center gap-2.5 hover:bg-white/5 disabled:opacity-50"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <OAuthIcon provider={provider} />
              {oauthLoading === provider ? "Redirecionando..." : label}
            </button>
          ))}
        </div>

        <div className="mt-5 relative flex items-center">
          <div className="flex-1 border-t border-white/10" />
          <span className="mx-3 text-xs text-white/30">ou use seu e-mail</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
              placeholder="Opcional se usar link de acesso"
            />
            <div className="mt-2 text-right">
              <Link href="/auth/recover" className="text-xs text-white/50 hover:text-white transition-colors">
                Esqueci minha senha
              </Link>
            </div>
          </div>

          {magicLinkSent && (
            <p className="text-sm text-center" style={{ color: "#52B788" }}>
              Enviamos um link de acesso para {email.trim()}. Verifique sua caixa de entrada.
            </p>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={passwordLoading || !password}
            className="w-full py-3 rounded-lg text-sm font-medium text-black transition-opacity disabled:opacity-50"
            style={{ background: "#C8F04A" }}
          >
            {passwordLoading ? "Entrando..." : "Entrar com senha"}
          </button>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={magicLinkLoading}
            className="w-full py-3 rounded-lg text-sm font-medium border border-white/10 text-white/70 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {magicLinkLoading ? "Enviando..." : "Entrar sem senha por e-mail"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Novo no HealthAxis?{" "}
          <Link href="/auth/signup" className="text-white/70 hover:text-white transition-colors">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
