"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Target, Repeat, Loader2 } from "lucide-react";
import type { CarePlan } from "@/lib/supabase/care-plan-queries";
import { createCarePlan, addGoal, updateGoalStatus, addHabit, toggleHabit } from "@/lib/supabase/care-plan-mutations";

const GOAL_STATUS_LABELS: Record<string, string> = { open: "Aberta", met: "Atingida", missed: "Não atingida", paused: "Pausada" };

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E4D9" };
const cardStyle = { background: "#141412", border: "1px solid rgba(255,255,255,0.07)" };

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("pt-BR");
}

export function CarePlanEditor({ patientId, plan }: { patientId: string; plan: CarePlan | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // create
  const [title, setTitle] = useState("Plano de cuidado");
  const [summary, setSummary] = useState("");
  // goal
  const [gDesc, setGDesc] = useState("");
  const [gMetric, setGMetric] = useState("");
  const [gTarget, setGTarget] = useState("");
  const [gDue, setGDue] = useState("");
  // habit
  const [hTitle, setHTitle] = useState("");
  const [hFreq, setHFreq] = useState("");
  const [hNotes, setHNotes] = useState("");

  function run(action: () => Promise<{ error: string | null }>, onOk?: () => void) {
    setError("");
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
      else {
        onOk?.();
        router.refresh();
      }
    });
  }

  if (!plan) {
    return (
      <div className="rounded-3xl p-6" style={cardStyle}>
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#E8E4D9" }}>
          <ClipboardList size={15} style={{ color: "#52B788" }} /> Criar plano de cuidado
        </h2>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>
          O plano organiza metas e hábitos prescritos por você. O paciente registra check-ins de adesão. Nada é prescrito automaticamente — você está no comando, e toda alteração é auditada.
        </p>
        <div className="mt-4 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do plano" className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle} />
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Resumo / objetivo geral (opcional)" rows={3} className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none resize-none" style={inputStyle} />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={() => run(() => createCarePlan(patientId, title, summary))}
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#52B788", color: "#0D0D0B" }}
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Criar plano
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do plano */}
      <div className="rounded-3xl p-5 lg:p-6" style={cardStyle}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#E8E4D9" }}>
            <ClipboardList size={15} style={{ color: "#52B788" }} /> {plan.title}
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>{plan.status}</span>
        </div>
        {plan.summary && <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>{plan.summary}</p>}
        {plan.latest_check_in && (
          <p className="text-xs mt-3" style={{ color: "#5A5A50" }}>
            Último check-in: {formatDate(plan.latest_check_in.created_at)}
            {plan.latest_check_in.adherence !== null ? ` · adesão ${plan.latest_check_in.adherence}%` : ""}
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Metas */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#9A9688" }}>
          <Target size={14} style={{ color: "#52B788" }} /> Metas ({plan.goals.length})
        </h3>
        <div className="space-y-2">
          {plan.goals.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl" style={cardStyle}>
              <div className="min-w-0">
                <p className="text-sm" style={{ color: "#E8E4D9" }}>{g.description}</p>
                <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>{[g.metric, g.target, g.due_date ? `até ${formatDate(g.due_date)}` : null].filter(Boolean).join(" · ") || "Sem métrica definida"}</p>
              </div>
              <select
                value={g.status}
                disabled={pending}
                onChange={(e) => run(() => updateGoalStatus(g.id, plan.id, patientId, e.target.value))}
                className="text-xs rounded-xl px-2 py-1.5 outline-none shrink-0"
                style={inputStyle}
              >
                {Object.entries(GOAL_STATUS_LABELS).map(([v, l]) => <option key={v} value={v} style={{ background: "#141412" }}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>
        {/* Add goal */}
        <div className="mt-3 rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)" }}>
          <input value={gDesc} onChange={(e) => setGDesc(e.target.value)} placeholder="Descrição da meta (ex.: reduzir HbA1c)" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={gMetric} onChange={(e) => setGMetric(e.target.value)} placeholder="Métrica (HbA1c)" className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            <input value={gTarget} onChange={(e) => setGTarget(e.target.value)} placeholder="Alvo (< 5.7%)" className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            <input type="date" value={gDue} onChange={(e) => setGDue(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <button
            onClick={() => run(() => addGoal(plan.id, patientId, { description: gDesc, metric: gMetric, target: gTarget, due_date: gDue }), () => { setGDesc(""); setGMetric(""); setGTarget(""); setGDue(""); })}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "rgba(82,183,136,0.14)", border: "1px solid rgba(82,183,136,0.3)", color: "#52B788" }}
          >
            <Plus size={13} /> Adicionar meta
          </button>
        </div>
      </div>

      {/* Hábitos */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#9A9688" }}>
          <Repeat size={14} style={{ color: "#52B788" }} /> Hábitos prescritos ({plan.habits.length})
        </h3>
        <div className="space-y-2">
          {plan.habits.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl" style={{ ...cardStyle, opacity: h.active ? 1 : 0.55 }}>
              <div className="min-w-0">
                <p className="text-sm" style={{ color: "#E8E4D9" }}>{h.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>{[h.frequency, h.notes].filter(Boolean).join(" · ") || "Sem frequência definida"}</p>
              </div>
              <button
                onClick={() => run(() => toggleHabit(h.id, plan.id, patientId, !h.active))}
                disabled={pending}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={inputStyle}
              >
                {h.active ? "Pausar" : "Reativar"}
              </button>
            </div>
          ))}
        </div>
        {/* Add habit */}
        <div className="mt-3 rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)" }}>
          <input value={hTitle} onChange={(e) => setHTitle(e.target.value)} placeholder="Hábito (ex.: caminhar 30 min)" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={hFreq} onChange={(e) => setHFreq(e.target.value)} placeholder="Frequência (diário, 3x/semana)" className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            <input value={hNotes} onChange={(e) => setHNotes(e.target.value)} placeholder="Observações (opcional)" className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <button
            onClick={() => run(() => addHabit(plan.id, patientId, { title: hTitle, frequency: hFreq, notes: hNotes }), () => { setHTitle(""); setHFreq(""); setHNotes(""); })}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "rgba(82,183,136,0.14)", border: "1px solid rgba(82,183,136,0.3)", color: "#52B788" }}
          >
            <Plus size={13} /> Prescrever hábito
          </button>
        </div>
      </div>

      <p className="text-xs" style={{ color: "#5A5A50" }}>Toda criação, meta e hábito é registrada na trilha de auditoria (care_plan_events).</p>
    </div>
  );
}
