import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";

export interface CompactTrend {
  name: string;
  from: number;
  to: number;
  unit: string;
  direction: "up" | "down" | "stable";
  improving: boolean;   // melhora clínica (cor verde) vs piora (vermelho)
}

interface Props {
  trends: CompactTrend[];
}

const DIR_LABEL: Record<CompactTrend["direction"], string> = { up: "aumento", down: "queda", stable: "estável" };

export function CompactTrendsCard({ trends }: Props) {
  if (trends.length === 0) return null;
  return (
    <div className="rounded-3xl p-6 flex flex-col gap-4"
      style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Tendências importantes</p>
        <BarChart2 size={16} style={{ color: "#52B788" }} />
      </div>

      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {trends.map((t) => {
          const Icon = t.direction === "up" ? TrendingUp : t.direction === "down" ? TrendingDown : Minus;
          const color = t.direction === "stable" ? "#9A9688" : t.improving ? "#52B788" : "#C1440E";
          return (
            <div key={t.name} className="flex items-center gap-3 py-2.5">
              <Icon size={18} style={{ color }} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#E8E4D9" }}>{t.name}</p>
                <p className="text-xs" style={{ color: "#5A5A50" }}>
                  Tendência: <span style={{ color }}>{DIR_LABEL[t.direction]}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs" style={{ color: "#5A5A50" }}>{t.from} →</p>
                <p className="text-sm font-bold" style={{ color }}>{t.to} <span className="text-xs font-normal" style={{ color: "#5A5A50" }}>{t.unit}</span></p>
              </div>
            </div>
          );
        })}
      </div>

      <Link href="/exams" className="text-sm font-medium" style={{ color: "#52B788" }}>
        Ver gráficos →
      </Link>
    </div>
  );
}
