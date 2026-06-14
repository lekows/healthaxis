"use client";

import { useState } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";

type PatternType = "protective" | "concern" | "mixed";

type MetabolicPattern = {
  name: string;
  summary?: string;
  description: string;
  evidence: string[];
  relevance: "high" | "medium" | "low";
  type?: PatternType;
};

type MetabolicOutput = {
  patterns: MetabolicPattern[];
  notes?: string;
  confidence: number;
};

interface Props {
  run: {
    id: string;
    output_json: unknown;
    confidence_score: number | null;
    completed_at: string | null;
  };
}

function parseOutput(raw: unknown): MetabolicOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.patterns)) return null;
  return {
    patterns: r.patterns as MetabolicPattern[],
    notes: typeof r.notes === "string" ? r.notes : undefined,
    confidence: typeof r.confidence === "number" ? r.confidence : 0,
  };
}

function patternStyle(type: PatternType | undefined, relevance: string) {
  if (type === "protective") {
    return { color: "#52B788", bg: "rgba(82,183,136,0.08)", border: "rgba(82,183,136,0.2)", label: "Bom" };
  }
  if (type === "concern") {
    if (relevance === "high") return { color: "#C1440E", bg: "rgba(193,68,14,0.08)",  border: "rgba(193,68,14,0.2)",  label: "Ruim" };
    return                         { color: "#F4A261", bg: "rgba(244,162,97,0.08)",  border: "rgba(244,162,97,0.2)",  label: "Regular" };
  }
  if (type === "mixed") {
    return { color: "#F4A261", bg: "rgba(244,162,97,0.08)", border: "rgba(244,162,97,0.2)", label: "Regular" };
  }
  // Fallback: análises antigas sem campo type
  if (relevance === "high")   return { color: "#C1440E", bg: "rgba(193,68,14,0.08)",  border: "rgba(193,68,14,0.2)",  label: "Ruim" };
  if (relevance === "medium") return { color: "#F4A261", bg: "rgba(244,162,97,0.08)", border: "rgba(244,162,97,0.2)", label: "Regular" };
  return                             { color: "#52B788", bg: "rgba(82,183,136,0.08)", border: "rgba(82,183,136,0.2)", label: "Bom" };
}

function PatternCard({ p }: { p: MetabolicPattern }) {
  const [open, setOpen] = useState(false);
  const style = patternStyle(p.type, p.relevance ?? "low");
  const preview = p.summary ?? p.description;

  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left rounded-2xl p-4 space-y-2 transition-opacity hover:opacity-90"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider shrink-0" style={{ color: style.color }}>
            {style.label}
          </span>
          <p className="text-sm font-semibold truncate" style={{ color: "#E8E4D9" }}>{p.name}</p>
        </div>
        {open
          ? <ChevronUp size={13} style={{ color: "#5A5A50", flexShrink: 0 }} />
          : <ChevronDown size={13} style={{ color: "#5A5A50", flexShrink: 0 }} />}
      </div>

      <p className={`text-xs leading-relaxed ${open ? "" : "line-clamp-1"}`} style={{ color: "#9A9688" }}>
        {open ? p.description : preview}
      </p>

      {open && p.evidence?.length > 0 && (
        <div className="space-y-0.5 pt-1">
          {p.evidence.map((ev, j) => (
            <p key={j} className="text-xs" style={{ color: "#5A5A50" }}>· {ev}</p>
          ))}
        </div>
      )}
    </button>
  );
}

export function MetabolicInsightsCard({ run }: Props) {
  const output = parseOutput(run.output_json);
  if (!output) return null;
  if (output.patterns.length === 0 && !output.notes) return null;

  const confidence = Math.round((run.confidence_score ?? output.confidence) * 100);
  const runDate = run.completed_at
    ? new Date(run.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div className="rounded-3xl p-5 space-y-3" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity size={15} style={{ color: "#52B788" }} />
          <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Padrões metabólicos</p>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(82,183,136,0.1)", color: "#52B788" }}>
            {confidence}% confiança
          </span>
        </div>
        {runDate && <p className="text-xs" style={{ color: "#5A5A50" }}>{runDate}</p>}
      </div>

      {output.patterns.length === 0 ? (
        <p className="text-sm" style={{ color: "#9A9688" }}>
          Nenhum padrão metabólico identificado com os dados disponíveis.
        </p>
      ) : (
        <div className="space-y-2">
          {output.patterns.map((p, i) => <PatternCard key={i} p={p} />)}
        </div>
      )}

      {output.notes && (
        <p className="text-xs leading-relaxed pt-1" style={{ color: "#5A5A50" }}>{output.notes}</p>
      )}

      <p className="text-xs" style={{ color: "#5A5A50" }}>
        Análise informacional. Não substitui avaliação médica.
      </p>
    </div>
  );
}
