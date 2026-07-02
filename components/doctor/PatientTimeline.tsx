import { BrainCircuit, FlaskConical, Target, type LucideIcon } from "lucide-react";

export type TimelineEventKind = "exam" | "ai" | "plan";

export interface TimelineDecision {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  date: string;
  title: string;
  sub?: string;
  decision?: TimelineDecision | null;
}

const KIND_META: Record<TimelineEventKind, { icon: LucideIcon; color: string; bg: string; border: string }> = {
  exam: { icon: FlaskConical, color: "#52B788", bg: "rgba(82,183,136,0.1)", border: "rgba(82,183,136,0.2)" },
  ai: { icon: BrainCircuit, color: "#F4A261", bg: "rgba(244,162,97,0.1)", border: "rgba(244,162,97,0.22)" },
  plan: { icon: Target, color: "#9A9688", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" },
};

function formatFullDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Timeline clínica vertical conectada: exames recebidos, análises de IA (com a
// decisão humana) e atualizações do plano de cuidado, do mais recente ao mais
// antigo. Componente puramente apresentacional; os eventos são montados no
// server component da página do paciente.
export function PatientTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm" style={{ color: "#5A5A50" }}>Sem eventos clínicos registrados ainda.</p>;
  }

  return (
    <div className="relative">
      {/* Trilho vertical conectando os eventos */}
      <div className="absolute left-[15px] top-3 bottom-3 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />

      <div className="space-y-4">
        {events.map((e) => {
          const meta = KIND_META[e.kind];
          const Icon = meta.icon;
          return (
            <div key={e.id} className="relative flex gap-4">
              <div
                className="relative z-10 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
              >
                <Icon size={15} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0 rounded-2xl p-4" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium min-w-0" style={{ color: "#E8E4D9" }}>{e.title}</p>
                  <p className="text-xs whitespace-nowrap" style={{ color: "#5A5A50" }}>{formatFullDate(e.date)}</p>
                </div>
                {e.sub && <p className="text-xs mt-1" style={{ color: "#9A9688" }}>{e.sub}</p>}
                {e.decision && (
                  <span
                    className="inline-block mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: e.decision.bg, border: `1px solid ${e.decision.border}`, color: e.decision.color }}
                  >
                    {e.decision.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
