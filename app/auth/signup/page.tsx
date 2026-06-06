"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { seedUserData, updateUserRole } from "@/app/auth/actions";

function translateError(msg: string): string {
  if (msg.includes("Password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("already registered") || msg.includes("already been registered")) return "Este e-mail já está cadastrado.";
  if (msg.includes("rate limit")) return "Muitas tentativas. Tente novamente em alguns minutos.";
  if (msg.includes("Unable to validate email")) return "E-mail inválido.";
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  return msg;
}

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [crm, setCrm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, crm: crm || null } },
    });

    if (signUpError) {
      setError(translateError(signUpError.message));
      setLoading(false);
      return;
    }

    // Supabase requires email confirmation — session is null until confirmed
    if (!signUpData.session) {
      setConfirmationSent(true);
      setLoading(false);
      return;
    }

    // Immediately authenticated (email confirmation disabled)
    const userId = signUpData.user!.id;
    await updateUserRole(userId, role, crm || undefined);
    if (role === "patient") {
      await seedUserData(userId);
      router.push("/dashboard");
    } else {
      router.push("/doctor/setup");
    }
    router.refresh();
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (confirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0D0B" }}>
        <div className="w-full max-w-md px-8 py-10 rounded-2xl border border-white/10 text-center" style={{ background: "#161614" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <svg className="w-5 h-5" fill="none" stroke="#52B788" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Confirme seu e-mail</h2>
          <p className="text-sm text-white/40 mb-6">
            Enviamos um link de confirmação para <span className="text-white/70">{email}</span>. Clique no link para ativar sua conta.
          </p>
          <Link href="/auth/login" className="text-sm text-white/50 hover:text-white transition-colors">
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0D0B" }}>
      <div className="w-full max-w-md px-8 py-10 rounded-2xl border border-white/10" style={{ background: "#161614" }}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">HealthAxis</h1>
          <p className="text-sm text-white/40 mt-1">Crie sua conta</p>
        </div>

        <div className="mb-6">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Tipo de conta</p>
          <div className="grid grid-cols-2 gap-2">
            {(["patient", "doctor"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className="py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: role === r ? "rgba(82,183,136,0.1)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${role === r ? "#52B788" : "rgba(255,255,255,0.1)"}`,
                  color: role === r ? "#52B788" : "rgba(255,255,255,0.5)",
                }}
              >
                {r === "patient" ? "Sou Paciente" : "Sou Médico"}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Nome</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
              placeholder="Seu nome completo"
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {role === "doctor" && (
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">CRM</label>
              <input
                type="text"
                required
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
                placeholder="Ex: 123456/SP"
              />
              <p className="mt-1.5 text-xs" style={{ color: "#5A5A50" }}>
                Insira seu CRM com UF. Nossa equipe pode validar antes de ativar o acesso médico completo.
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium text-black transition-opacity disabled:opacity-50"
            style={{ background: "#C8F04A" }}
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <div className="mt-5 relative flex items-center">
          <div className="flex-1 border-t border-white/10" />
          <span className="mx-3 text-xs text-white/30">ou</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          className="mt-3 w-full py-3 rounded-lg text-sm font-medium border border-white/10 transition-colors flex items-center justify-center gap-2.5 hover:bg-white/5"
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

        <p className="mt-6 text-center text-sm text-white/40">
          Já tem conta?{" "}
          <Link href="/auth/login" className="text-white/70 hover:text-white transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
