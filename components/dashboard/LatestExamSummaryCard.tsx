import Link from "next/link";
import { FlaskConical } from "lucide-react";

interface Props {
  examDate: string | null;   // ISO date do último exame
  found: number;             // biomarcadores encontrados
  outOfRange: number;        // fora da faixa de referência
  relevantChange: number;    // com mudança relevante (tendência ≠ estável)
}

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function LatestExamSummaryCard({ examDate, found, outOfRange, relevantChange }: Props) {
  const tiles = [
    { value: found, label: "biomarcadores encontrados", color: "#E8E4D9" },
    { value: outOfRange, label: "fora da faixa de referência", color: "#C1440E" },
    { value: relevantChange, label: "com mudança relevante", color: "#F4A261" },
  ];

  return (
    <div className="rounded-3xl p-6 flex flex-col gap-4"
      style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Último exame</p>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
          <FlaskConical size={16} style={{ color: "#52B788" }} />
        </div>
      </div>

      {found === 0 && !examDate ? (
        <p className="text-sm" style={{ color: "#9A9688" }}>Nenhum exame processado ainda.</p>
      ) : (
        <>
          <p className="text-sm" style={{ color: "#9A9688" }}>
            Exame de <span style={{ color: "#52B788" }}>{fmt(examDate)}</span> processado com sucesso.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="p-3 rounded-2xl text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-2xl font-bold" style={{ color: t.color }}>{t.value}</p>
                <p className="text-xs mt-1 leading-tight" style={{ color: "#5A5A50" }}>{t.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Link href="/exams"
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.05)", color: "#E8E4D9", border: "1px solid rgba(255,255,255,0.08)" }}>
              Ver resumo
            </Link>
            <Link href="/report"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-opacity hover:opacity-90"
              style={{ background: "#52B788", color: "#0D0D0B" }}>
              Gerar relatório
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
