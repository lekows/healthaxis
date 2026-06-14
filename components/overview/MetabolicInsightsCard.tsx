import { Activity } from "lucide-react";

type MetabolicPattern = {
  name: string;
  description: string;
  evidence: string[];
  relevance: "high" | "medium" | "low";
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

const RELEVANCE_COLOR: Record<string, string> = {
  high: "#C1440E",
  medium: "#F4A261",
  low: "#52B788",
};

const RELEVANCE_BG: Record<string, string> = {
  high: "rgba(193,68,14,0.08)",
  medium: "rgba(244,162,97,0.08)",
  low: "rgba(82,183,136,0.08)",
};

const RELEVANCE_BORDER: Record<string, string> = {
  high: "rgba(193,68,14,0.2)",
  medium: "rgba(244,162,97,0.2)",
  low: "rgba(82,183,136,0.2)",
};

const RELEVANCE_LABEL: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

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
            const rel = p.relevance ?? "low";
            return (
              <div key={i} className="rounded-2xl p-4 space-y-2"
                style={{ background: RELEVANCE_BG[rel] ?? RELEVANCE_BG.low, border: `1px solid ${RELEVANCE_BORDER[rel] ?? RELEVANCE_BORDER.low}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: RELEVANCE_COLOR[rel] ?? RELEVANCE_COLOR.low }}>
                    {RELEVANCE_LABEL[rel] ?? rel}
                  </span>
                  <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{p.name}</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#9A9688" }}>{p.description}</p>
                {p.evidence?.length > 0 && (
                  <div className="space-y-0.5 pt-1">
                    {p.evidence.map((ev, j) => (
                      <p key={j} className="text-xs" style={{ color: "#5A5A50" }}>· {ev}</p>
                    ))}
                  </div>
                )}
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
