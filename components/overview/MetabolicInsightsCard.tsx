import { Activity } from "lucide-react";

type PatternType = "protective" | "concern" | "mixed";

type MetabolicPattern = {
  name: string;
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

const RELEVANCE_LABEL: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

function patternColors(type: PatternType | undefined, relevance: string) {
  if (type === "protective") {
    return {
      color:  "#52B788",
      bg:     "rgba(82,183,136,0.08)",
      border: "rgba(82,183,136,0.2)",
      label:  relevance === "high" ? "Ótimo" : "Bom",
    };
  }
  if (type === "concern") {
    if (relevance === "high")   return { color: "#C1440E", bg: "rgba(193,68,14,0.08)",   border: "rgba(193,68,14,0.2)",   label: "Alta" };
    if (relevance === "medium") return { color: "#F4A261", bg: "rgba(244,162,97,0.08)",  border: "rgba(244,162,97,0.2)",  label: "Média" };
    return                             { color: "#F4A261", bg: "rgba(244,162,97,0.05)",  border: "rgba(244,162,97,0.15)", label: "Baixa" };
  }
  if (type === "mixed") {
    return { color: "#F4A261", bg: "rgba(244,162,97,0.08)", border: "rgba(244,162,97,0.2)", label: "Misto" };
  }
  // Fallback para análises antigas sem campo type
  const fallback: Record<string, { color: string; bg: string; border: string; label: string }> = {
    high:   { color: "#C1440E", bg: "rgba(193,68,14,0.08)",  border: "rgba(193,68,14,0.2)",  label: "Alta" },
    medium: { color: "#F4A261", bg: "rgba(244,162,97,0.08)", border: "rgba(244,162,97,0.2)", label: "Média" },
    low:    { color: "#52B788", bg: "rgba(82,183,136,0.08)", border: "rgba(82,183,136,0.2)", label: "Baixa" },
  };
  return fallback[relevance] ?? fallback.low;
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
    <div className="rounded-3xl p-5 space-y-4" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity size={15} style={{ color: "#52B788" }} />
          <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Padrões metabólicos</p>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(82,183,136,0.1)", color: "#52B788" }}>
            {confidence}% confiança
          </span>
        </div>
        {runDate && (
          <p className="text-xs" style={{ color: "#5A5A50" }}>{runDate}</p>
        )}
      </div>

      {output.patterns.length === 0 ? (
        <p className="text-sm" style={{ color: "#9A9688" }}>
          Nenhum padrão metabólico significativo identificado com os dados disponíveis.
        </p>
      ) : (
        <div className="space-y-3">
          {output.patterns.map((p, i) => {
            const colors = patternColors(p.type, p.relevance ?? "low");
            return (
              <div key={i} className="rounded-2xl p-4 space-y-2"
                style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: colors.color }}>
                    {colors.label}
                  </span>
                  <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{p.name}</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#9A9688" }}>{p.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {output.notes && (
        <p className="text-xs leading-relaxed" style={{ color: "#5A5A50" }}>{output.notes}</p>
      )}

      <p className="text-xs" style={{ color: "#5A5A50" }}>
        Análise informacional gerada automaticamente. Não substitui avaliação médica.
      </p>
    </div>
  );
}
