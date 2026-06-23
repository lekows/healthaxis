"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

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
