"use client";

import { useState } from "react";
import { CheckCircle2, Edit3, ShieldCheck, XCircle } from "lucide-react";
import type { AgentRunForReview } from "@/lib/supabase/agent-review-queries";
import { getAgentDisplayName } from "@/lib/agent-display";

interface Props {
  agentRun: AgentRunForReview;
  patientId: string;
  summary: string;
  highlights: string[];
}

function decisionLabel(decision: AgentRunForReview["human_decision"]) {
  if (decision === "accepted") return "Aceita";
  if (decision === "edited") return "Editada";
  if (decision === "rejected") return "Rejeitada";
  return "Pendente";
}

function decisionStyle(decision: AgentRunForReview["human_decision"]) {
  if (decision === "accepted") return { background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" };
  if (decision === "edited") return { background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.22)", color: "#F4A261" };
  if (decision === "rejected") return { background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" };
  return { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9A9688" };
}

export function AgentReviewCard({ agentRun, patientId, summary, highlights }: Props) {
  const [decision, setDecision] = useState(agentRun.human_decision);
  const [busy, setBusy] = useState<"accepted" | "edited" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editedSummary, setEditedSummary] = useState(summary);

  async function submitReview(action: "accepted" | "edited" | "rejected") {
    setBusy(action);
    setError(null);

    const editedOutput = action === "edited"
      ? {
          ...(agentRun.output_json ?? {}),
          reviewed_summary: editedSummary,
          review_note: "Resumo editado pelo médico antes de uso clínico.",
        }
      : action === "rejected"
        ? {
            rejection_reason: editedSummary || "Interpretação rejeitada pelo médico.",
          }
        : null;

    const response = await fetch("/api/doctor/agent-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentRunId: agentRun.id,
        patientId,
        action,
        editedOutput,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error ?? "Erro ao registrar revisão.");
      setBusy(null);
      return;
    }

    setDecision(action);
    setBusy(null);
    setEditOpen(false);
  }

  return (
    <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck size={16} style={{ color: "#52B788" }} />
            <h3 className="text-sm font-semibold" style={{ color: "#E8E4D9" }} title={agentRun.agent_name}>
              {getAgentDisplayName(agentRun.agent_name)}
            </h3>
            <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={decisionStyle(decision)}>
              {decisionLabel(decision)}
            </span>
          </div>
          <p className="text-xs mt-2" style={{ color: "#5A5A50" }}>
            Modelo: {agentRun.model_used ?? "não informado"} · confiança: {agentRun.confidence_score ?? "-"}
          </p>
        </div>
      </div>

      <p className="text-sm mt-4 leading-relaxed" style={{ color: "#E8E4D9" }}>{summary}</p>

      {highlights.length > 0 && (
        <div className="mt-4 space-y-2">
          {highlights.map((highlight) => (
            <div key={highlight} className="rounded-2xl px-3 py-2 text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#9A9688" }}>
              {highlight}
            </div>
          ))}
        </div>
      )}

      {editOpen && (
        <div className="mt-4 space-y-2">
          <label className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Texto revisado / motivo</label>
          <textarea
            value={editedSummary}
            onChange={(event) => setEditedSummary(event.target.value)}
            rows={5}
            className="w-full rounded-2xl p-3 text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E4D9" }}
          />
        </div>
      )}

      {error && <p className="text-xs mt-3" style={{ color: "#F4A261" }}>{error}</p>}

      <div className="flex flex-col sm:flex-row gap-2 mt-5">
        <button
          type="button"
          onClick={() => submitReview("accepted")}
          disabled={Boolean(busy)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#52B788", color: "#0D0D0B" }}
        >
          <CheckCircle2 size={15} /> {busy === "accepted" ? "Salvando..." : "Aceitar"}
        </button>

        <button
          type="button"
          onClick={() => editOpen ? submitReview("edited") : setEditOpen(true)}
          disabled={Boolean(busy)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "rgba(244,162,97,0.12)", border: "1px solid rgba(244,162,97,0.24)", color: "#F4A261" }}
        >
          <Edit3 size={15} /> {busy === "edited" ? "Salvando..." : editOpen ? "Salvar edição" : "Editar"}
        </button>

        <button
          type="button"
          onClick={() => editOpen ? submitReview("rejected") : setEditOpen(true)}
          disabled={Boolean(busy)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" }}
        >
          <XCircle size={15} /> {busy === "rejected" ? "Salvando..." : editOpen ? "Rejeitar com motivo" : "Rejeitar"}
        </button>
      </div>
    </div>
  );
}
