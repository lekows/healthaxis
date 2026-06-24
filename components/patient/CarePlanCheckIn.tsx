"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { addPatientCheckIn } from "@/lib/supabase/care-plan-mutations";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E4D9" };

export function CarePlanCheckIn({ planId }: { planId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [adherence, setAdherence] = useState(80);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await addPatientCheckIn(planId, note, adherence);
      if (res.error) setError(res.error);
      else {
        setDone(true);
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Registrar check-in</h2>
      <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Conte como está sua adesão ao plano. Seu médico acompanha pelo painel.</p>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Adesão</label>
            <span className="text-sm font-semibold" style={{ color: "#52B788" }}>{adherence}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={adherence}
            onChange={(e) => setAdherence(Number(e.target.value))}
            className="w-full mt-2 accent-[#52B788]"
          />
        </div>

        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); setDone(false); }}
          placeholder="Como foi a semana? Dificuldades, sintomas, vitórias… (opcional)"
          rows={3}
          className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none resize-none"
          style={inputStyle}
        />

        {error && <p className="text-red-400 text-xs">{error}</p>}
        {done && !error && (
          <p className="text-xs inline-flex items-center gap-1.5" style={{ color: "#52B788" }}>
            <CheckCircle2 size={13} /> Check-in registrado. Obrigado!
          </p>
        )}

        <button
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#52B788", color: "#0D0D0B" }}
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Enviar check-in
        </button>
      </div>
    </div>
  );
}
