"use client";

import { useState } from "react";
import { X, Edit3, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { updateProfile } from "@/app/profile/actions";
import { useRouter } from "next/navigation";

interface ProfileData {
  name: string;
  dob: string | null;
  sex: string | null;
  blood: string | null;
  height: number | null;
  weight: number | null;
}

export function ProfileEditModal({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [name,   setName]   = useState(profile.name);
  const [dob,    setDob]    = useState(profile.dob ?? "");
  const [sex,    setSex]    = useState(profile.sex ?? "");
  const [blood,  setBlood]  = useState(profile.blood ?? "");
  const [height, setHeight] = useState(profile.height ? String(profile.height) : "");
  const [weight, setWeight] = useState(profile.weight ? String(profile.weight) : "");

  const handleSave = async () => {
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    setLoading(true);
    setError(null);
    const result = await updateProfile({
      name:   name.trim(),
      dob:    dob    || null,
      sex:    (sex as "masculino" | "feminino" | "outro") || null,
      blood:  blood  || null,
      height: height ? parseFloat(height) : null,
      weight: weight ? parseFloat(weight) : null,
    });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    router.refresh();
    setOpen(false);
  };

  const inputStyle = {
    background: "#1C1C19",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#E8E4D9",
  } as const;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Edit3 size={14} /> Editar
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md flex flex-col rounded-3xl"
            style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.1)" }}>

            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-base font-semibold" style={{ color: "#E8E4D9" }}>Editar perfil</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                style={{ color: "#5A5A50" }}>
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Nome completo *</label>
                <input value={name} onChange={e => setName(e.target.value)} disabled={loading}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                  style={inputStyle} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Data de nascimento</label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)} disabled={loading}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ ...inputStyle, colorScheme: "dark" }} />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>
                    Sexo biológico
                    <span className="ml-1 text-[10px]" style={{ color: "#52B788" }}>para referências</span>
                  </label>
                  <select value={sex} onChange={e => setSex(e.target.value)} disabled={loading}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ ...inputStyle, color: sex ? "#E8E4D9" : "#5A5A50" }}>
                    <option value="">Selecione</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Tipo sanguíneo</label>
                  <select value={blood} onChange={e => setBlood(e.target.value)} disabled={loading}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ ...inputStyle, color: blood ? "#E8E4D9" : "#5A5A50" }}>
                    <option value="">Selecione</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Altura (cm)</label>
                  <input type="number" value={height} onChange={e => setHeight(e.target.value)} disabled={loading}
                    placeholder="ex: 175" className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={inputStyle} />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9688" }}>Peso (kg)</label>
                  <input type="number" value={weight} onChange={e => setWeight(e.target.value)} disabled={loading}
                    placeholder="ex: 70" className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={inputStyle} />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ background: "rgba(193,68,14,0.08)", border: "1px solid rgba(193,68,14,0.2)", color: "#C1440E" }}>
                  <AlertTriangle size={13} /> {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button onClick={() => setOpen(false)} disabled={loading}
                className="text-sm disabled:opacity-40" style={{ color: "#5A5A50" }}>
                Cancelar
              </button>
              <Button variant="primary" onClick={handleSave} disabled={loading}>
                {loading
                  ? <><Loader2 size={13} className="animate-spin" /> Salvando…</>
                  : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
