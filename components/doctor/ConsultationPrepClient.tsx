"use client";

import { useState } from "react";
import { Sparkles, CheckCircle, XCircle, Pencil, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { ConsultationBrief } from "@/lib/agents/types";

interface Props {
  patientId: string;
}

type State = "idle" | "loading" | "done" | "error";

export function ConsultationPrepClient({ patientId }: Props) {
  const [state, setState] = useState<State>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [brief, setBrief] = useState<ConsultationBrief | null>(null);
  const [decision, setDecision] = useState<"accepted" | "edited" | "rejected" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function handleGenerate() {
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/agents/consultation-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Erro ao gerar briefing"); setState("error"); return; }
      setRunId(data.runId);
      setBrief(data.brief);
      setState("done");
    } catch {
      setErrorMsg("Falha de conexão");
      setState("error");
    }
  }

  async function handleDecision(d: "accepted" | "rejected") {
    if (!runId) return;
    await fetch("/api/agents/consultation-prep", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId, decision: d }),
    });
    setDecision(d);
  }

  if (state === "idle" || state === "error") {
    return (
      <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Preparação de consulta</p>
            <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>
              Gera um briefing clínico informacional baseado nos dados do paciente para revisar antes da consulta.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.25)" }}
          >
            <Sparkles size={14} /> Gerar briefing
          </button>
        </div>
        {state === "error" && errorMsg && (
          <p className="text-xs mt-3" style={{ color: "#C1440E" }}>{errorMsg}</p>
        )}
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="rounded-3xl p-5 flex items-center gap-3" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
        <Loader2 size={16} className="animate-spin" style={{ color: "#52B788" }} />
        <p className="text-sm" style={{ color: "#9A9688" }}>Analisando dados do paciente…</p>
      </div>
    );
  }

  if (!brief) return null;

  const highlights = showAll ? brief.trendHighlights : brief.trendHighlights.slice(0, 3);
  const questions = showAll ? brief.openQuestions : brief.openQuestions.slice(0, 3);
  const hasMore = brief.trendHighlights.length > 3 || brief.openQuestions.length > 3;

  const directionColor = (d: string) =>
    d === "up" ? "#C1440E" : d === "down" ? "#F4A261" : "#52B788";

  const directionLabel = (d: string) =>
    d === "up" ? "↑" : d === "down" ? "↓" : "→";

  return (
    <div className="rounded-3xl p-5 space-y-4" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "#52B788" }} />
          <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Briefing de consulta</p>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(82,183,136,0.1)", color: "#52B788" }}>
            {Math.round(brief.confidence * 100)}% confiança
          </span>
        </div>
        {!decision && (
          <button onClick={handleGenerate} className="text-xs transition-opacity hover:opacity-60" style={{ color: "#5A5A50" }}>
            Regerar
          </button>
        )}
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>{brief.summary}</p>

      {highlights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#5A5A50" }}>Tendências</p>
          {highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="font-bold mt-0.5" style={{ color: directionColor(h.direction) }}>
                {directionLabel(h.direction)}
              </span>
              <div>
                <span className="font-medium" style={{ color: "#E8E4D9" }}>{h.biomarker}</span>
                <span style={{ color: "#9A9688" }}> — {h.note}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#5A5A50" }}>Pontos para investigar</p>
          {questions.map((q, i) => (
            <p key={i} className="text-xs" style={{ color: "#9A9688" }}>• {q}</p>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
          style={{ color: "#9A9688" }}
        >
          {showAll ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver mais</>}
        </button>
      )}

      {!decision && (
        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-xs flex-1" style={{ color: "#5A5A50" }}>Este briefing é informacional. Revisar antes de usar na consulta.</p>
          <button
            onClick={() => handleDecision("accepted")}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-opacity hover:opacity-80"
            style={{ background: "rgba(82,183,136,0.1)", color: "#52B788", border: "1px solid rgba(82,183,136,0.2)" }}
          >
            <CheckCircle size={12} /> Aceitar
          </button>
          <button
            onClick={() => handleDecision("rejected")}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-opacity hover:opacity-80"
            style={{ background: "rgba(193,68,14,0.08)", color: "#C1440E", border: "1px solid rgba(193,68,14,0.2)" }}
          >
            <XCircle size={12} /> Rejeitar
          </button>
        </div>
      )}

      {decision && (
        <div className="flex items-center gap-2 pt-2 border-t text-xs" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#5A5A50" }}>
          <Pencil size={11} />
          {decision === "accepted" ? "Briefing aceito" : "Briefing rejeitado"}
        </div>
      )}
    </div>
  );
}
