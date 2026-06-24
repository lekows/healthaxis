"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SessionStatus = "checking" | "ready" | "no-session";
type SupabaseBrowserClient = ReturnType<typeof createClient>;

export default function UpdatePasswordPage() {
  const router = useRouter();
  // Cria o client só no browser (effect/handler), nunca durante o render/prerender,
  // pois createClient() exige env vars que podem faltar no build estático.
  const supabaseRef = useRef<SupabaseBrowserClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  };
  const [status, setStatus] = useState<SessionStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Só libera o formulário se houver uma sessão de recuperação válida (vinda do
  // link do e-mail) ou uma sessão ativa. Sem isso, orienta a abrir pelo link.
  useEffect(() => {
    let active = true;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setStatus("ready");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION"))) {
        setStatus("ready");
      }
    });

    // Se nada estabelecer sessão dentro da janela, tratamos como acesso sem link.
    const timer = setTimeout(() => {
      if (active) setStatus((current) => (current === "checking" ? "no-session" : current));
    }, 4000);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await getSupabase().auth.updateUser({ password });

    if (updateError) {
      setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
      setLoading(false);
      return;
    }

    setMessage("Senha atualizada com sucesso. Redirecionando...");
    setLoading(false);
    router.replace("/auth/post-login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0D0B" }}>
      <div className="w-full max-w-md px-8 py-10 rounded-2xl border border-white/10" style={{ background: "#161614" }}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Definir nova senha</h1>
          <p className="text-sm text-white/40 mt-1">Crie uma nova senha para acessar sua conta.</p>
        </div>

        {status === "checking" && (
          <p className="text-sm text-center text-white/50 py-6">Verificando o link de recuperação...</p>
        )}

        {status === "no-session" && (
          <div className="text-center space-y-4 py-2">
            <p className="text-sm text-white/60">
              Abra esta página pelo link enviado no e-mail de recuperação. Se o link expirou ou não chegou,
              solicite um novo.
            </p>
            <Link
              href="/auth/recover"
              className="inline-block py-2.5 px-5 rounded-lg text-sm font-medium text-black transition-opacity hover:opacity-90"
              style={{ background: "#C8F04A" }}
            >
              Solicitar novo link
            </Link>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Nova senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Confirmar senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>

            {message && <p className="text-sm text-center" style={{ color: "#52B788" }}>{message}</p>}
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-medium text-black transition-opacity disabled:opacity-50"
              style={{ background: "#C8F04A" }}
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-white/40">
          Link expirou?{" "}
          <Link href="/auth/recover" className="text-white/70 hover:text-white transition-colors">
            solicitar outro
          </Link>
        </p>
      </div>
    </div>
  );
}
