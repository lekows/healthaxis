"use client";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui";
import { HoverCard, AnimatedProgressBar, StaggerContainer, StaggerItem, fadeUp } from "@/lib/motion";
import { preventiveReminders, biomarkers } from "@/data/mockData";
import { getBiomarkerLabel } from "@/lib/utils";

const checklist = [
  { label: "Hemograma completo anual", done: true, date: "Abr 2025" },
  { label: "Lipidograma", done: true, date: "Abr 2025" },
  { label: "Glicemia em jejum", done: true, date: "Abr 2025" },
  { label: "TSH (tireoide)", done: true, date: "Jan 2025" },
  { label: "Papanicolau", done: false, date: "Pendente" },
  { label: "Consulta ginecológica", done: false, date: "Pendente" },
  { label: "Densitometria óssea", done: false, date: "Não realizado" },
  { label: "Vacina influenza", done: true, date: "Nov 2024" },
  { label: "Pressão arterial", done: true, date: "Mai 2025" }
];

export function PreventiveChecklist() {
  const done = checklist.filter(c => c.done).length;
  const pct = Math.round((done / checklist.length) * 100);

  return (
    <HoverCard className="rounded-3xl p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Checklist Preventivo</h3>
        <Badge variant={pct >= 80 ? "success" : "warning"}>{pct}%</Badge>
      </div>
      <AnimatedProgressBar value={pct} color={pct >= 80 ? "#52B788" : "#F4A261"} />
      <StaggerContainer delay={0.05} className="space-y-3 mt-5">
        {checklist.map(item => (
          <StaggerItem key={item.label} variant={fadeUp}>
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.2 }}>
                {item.done
                  ? <CheckCircle2 size={14} style={{ color: "#52B788", flexShrink: 0 }} />
                  : <Circle size={14} style={{ color: "#5A5A50", flexShrink: 0 }} />
                }
              </motion.div>
              <span className="flex-1 text-sm" style={{ color: item.done ? "#E8E4D9" : "#9A9688" }}>{item.label}</span>
              <span className="text-xs" style={{ color: "#5A5A50" }}>{item.date}</span>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </HoverCard>
  );
}

export function HealthOverview() {
  const attention = biomarkers.filter(b => b.status === "attention" || b.status === "risk");

  return (
    <div className="space-y-6">
      {/* Attention markers */}
      {attention.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#9A9688" }}>
            <AlertCircle size={12} style={{ color: "#C1440E" }} /> Pontos de atenção
          </p>
          <StaggerContainer delay={0.1}>
            {attention.map(b => (
              <StaggerItem key={b.id} variant={fadeUp}>
                <div className="flex items-center gap-3 p-4 rounded-2xl mb-2"
                  style={{ background: "rgba(193,68,14,0.07)", border: "1px solid rgba(193,68,14,0.15)" }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{b.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>
                      Valor: <strong style={{ color: "#E8E4D9" }}>{b.value} {b.unit}</strong> — acima do ideal. Discuta com seu médico.
                    </p>
                  </div>
                  <Badge variant="warning">{getBiomarkerLabel(b.status)}</Badge>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      )}

      <PreventiveChecklist />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9A9688" }}>Próximos passos</p>
        <StaggerContainer delay={0.08}>
          {preventiveReminders.map(r => (
            <StaggerItem key={r.id} variant={fadeUp}>
              <div className="flex items-start gap-3 p-4 rounded-2xl mb-2"
                style={{
                  background: r.priority === "high" ? "rgba(193,68,14,0.07)" : "rgba(255,255,255,0.02)",
                  border: r.priority === "high" ? "1px solid rgba(193,68,14,0.18)" : "1px solid rgba(255,255,255,0.06)"
                }}>
                {r.priority === "high"
                  ? <AlertCircle size={14} style={{ color: "#C1440E", marginTop: 2, flexShrink: 0 }} />
                  : <CheckCircle2 size={14} style={{ color: "#52B788", marginTop: 2, flexShrink: 0 }} />
                }
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{r.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>{r.description}</p>
                </div>
                <span className="text-xs font-medium whitespace-nowrap ml-auto"
                  style={{ color: r.priority === "high" ? "#C1440E" : "#5A5A50" }}>
                  {r.daysUntil <= 0 ? "Hoje" : `${r.daysUntil}d`}
                </span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </div>
  );
}
