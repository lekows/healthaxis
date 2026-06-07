export type BiomarkerStatus = "optimal" | "attention" | "high" | "low" | "critical";

export interface BiomarkerLike {
  id: string;
  name: string;
  value: string;
  unit: string;
  status: BiomarkerStatus | string;
  last_date?: string | null;
  reference?: { min?: number; max?: number } | Record<string, unknown> | null;
}

export const STATUS_COLORS: Record<string, string> = {
  optimal: "#52B788",
  attention: "#F4A261",
  high: "#C1440E",
  low: "#F4A261",
  critical: "#C1440E",
};

export const STATUS_LABELS: Record<string, string> = {
  optimal: "Normal",
  attention: "Atenção",
  high: "Alto",
  low: "Baixo",
  critical: "Crítico",
};

// Maior = mais grave. Usado para ordenar o resumo de alertas do médico.
export const STATUS_SEVERITY: Record<string, number> = {
  critical: 4,
  high: 3,
  low: 3,
  attention: 2,
  optimal: 1,
};

export function isOutOfRange(status: string): boolean {
  return status === "critical" || status === "high" || status === "low";
}

export function BiomarkerCard({ b }: { b: BiomarkerLike }) {
  const color = STATUS_COLORS[b.status] ?? "#E8E4D9";
  return (
    <div className="rounded-2xl p-4 space-y-1" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-xs truncate" style={{ color: "#9A9688" }}>{b.name}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {b.value} <span className="text-xs font-normal" style={{ color: "#5A5A50" }}>{b.unit}</span>
      </p>
      {b.last_date && (
        <p className="text-xs" style={{ color: "#5A5A50" }}>
          {new Date(b.last_date).toLocaleDateString("pt-BR")}
        </p>
      )}
    </div>
  );
}
