"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DoctorProfile } from "@/lib/supabase/doctor-queries";

const UF_OPTIONS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

interface Props {
  initialData: DoctorProfile | null;
}

export function DoctorSetupForm({ initialData }: Props) {
  const router = useRouter();
  const [crm, setCrm] = useState(initialData?.crm ?? "");
  const [crmUf, setCrmUf] = useState(initialData?.crm_uf ?? "SP");
  const [specialty, setSpecialty] = useState(initialData?.specialty ?? "");
  const [bio, setBio] = useState(initialData?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/doctor/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crm, crmUf, specialty, bio }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Erro ao salvar.");
      setSaving(false);
      return;
    }

    router.push("/doctor");
    router.refresh();
  }

  const inputStyle = {
    background: "#1A1A17",
    border: "1px solid rgba(255,255,255,0.09)",
    color: "#E8E4D9",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "14px",
    width: "100%",
    outline: "none",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "#9A9688" }}>CRM *</label>
          <input
            required
            value={crm}
            onChange={e => setCrm(e.target.value)}
            placeholder="123456"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "#9A9688" }}>UF *</label>
          <select
            required
            value={crmUf}
            onChange={e => setCrmUf(e.target.value)}
            style={{ ...inputStyle, appearance: "none" }}
          >
            {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "#9A9688" }}>Especialidade</label>
        <input
          value={specialty}
          onChange={e => setSpecialty(e.target.value)}
          placeholder="Clínica Geral, Cardiologia…"
          style={inputStyle}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "#9A9688" }}>Bio (opcional)</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Breve apresentação que o paciente verá ao aceitar o convite."
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "#C1440E" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={saving || !crm || !crmUf}
        className="w-full py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "#52B788", color: "#0D0D0B" }}
      >
        {saving ? "Salvando…" : "Salvar e ativar conta médica"}
      </button>

      <p className="text-xs text-center" style={{ color: "#5A5A50" }}>
        Seus dados de CRM são usados apenas para identificação pelo paciente ao aceitar o convite. Não compartilhamos com terceiros.
      </p>
    </form>
  );
}
