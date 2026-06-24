"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateUserRole } from "@/app/auth/actions";

export default function SetupPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [crm, setCrm] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      setUserId(user.id);

      const displayName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        "";
      const metadataRole = user.user_metadata?.role;
      const metadataCrm = user.user_metadata?.crm;

      setName(displayName);
      if (metadataRole === "patient" || metadataRole === "doctor") setRole(metadataRole);
      if (typeof metadataCrm === "string") setCrm(metadataCrm);
      setInitializing(false);
    }
    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);

    const supabase = createClient();
    if (name) await supabase.from("profiles").update({ name }).eq("id", userId);

    await updateUserRole(userId, role, crm || undefined);

    if (role === "patient") {
      router.push("/dashboard");
    } else {
      router.push("/doctor/setup");
    }
    router.refresh();
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0D0B" }}>
        <p className="text-sm" style={{ color: "#5A5A50" }}>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0D0B" }}>
      <div className="w-full max-w-md px-8 py-10 rounded-2xl border border-white/10" style={{ background: "#161614" }}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Quase lá!</h1>
          <p className="text-sm text-white/40 mt-1">Conte-nos um pouco mais sobre você.</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium text-black transition-opacity disabled:opacity-50"
            style={{ background: "#C8F04A" }}
          >
            {loading ? "Salvando..." : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
