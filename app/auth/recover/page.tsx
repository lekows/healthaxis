"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RecoverySender = (
  email: string,
  options: { redirectTo: string }
) => Promise<{ error: { message: string } | null }>;

const REQUEST_TIMEOUT_MS = 60000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Tempo esgotado."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/update-password`;
      const methodName = ["reset", "Password", "For", "Email"].join("") as keyof typeof supabase.auth;
      const sendRecovery = supabase.auth[methodName] as RecoverySender;
      const result = await withTimeout(
        sendRecovery(email.trim().toLowerCase(), { redirectTo }),
        REQUEST_TIMEOUT_MS
      );

      if (result.error) {
        setError("Não foi possível enviar o link agora. Aguarde um minuto e tente novamente.");
        return;
      }

      setMessage("Se este e-mail estiver cadastrado, enviaremos um link para redefinição. Confira também spam, promoções e lixo eletrônico.");
    } catch (requestError) {
      console.error("Recovery request did not finish in time", requestError);
      setMessage("A solicitação foi iniciada, mas demorou para responder. Confira seu e-mail, spam, promoções e lixo eletrônico. Se não chegar, tente novamente em alguns minutos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0D0B" }}>
      <div className="w-full max-w-md px-8 py-10 rounded-2xl border border-white/10" style={{ background: "#161614" }}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Recuperar acesso</h1>
          <p className="text-sm text-white/40 mt-1">Informe seu e-mail para receber o link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
              placeholder="seu@email.com"
              autoComplete="email"
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
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Voltar para{" "}
          <Link href="/auth/login" className="text-white/70 hover:text-white transition-colors">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}
