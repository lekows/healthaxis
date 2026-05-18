"use client";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui";
import { HoverCard, AnimatedProgressBar, StaggerContainer, StaggerItem, fadeUp } from "@/lib/motion";
import { preventiveReminders, healthScore, biomarkers } from "@/data/mockData";
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
  const circumference = 2 * Math.PI * 40;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold" style={{ color: "#E8E4D9" }}>Visão Geral de Saúde</h1>
        <p className="text-sm mt-1" style={{ color: "#9A9688" }}>Panorama completo do seu estado preventivo.</p>
      </motion.div>

      {/* Score ring */}
      <HoverCard className="rounded-3xl p-6 flex items-center gap-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            <motion.circle
              cx="50" cy="50" r="40" fill="none" stroke="#52B788" strokeWidth="10" strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${circumference * healthScore.overall / 100} ${circumference}` }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span className="text-2xl font-bold" style={{ color: "#E8E4D9" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              {healthScore.overall}
            </motion.span>
          </div>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: "#E8E4D9" }}>Índice Preventivo</p>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: "#9A9688" }}>
            Sua pontuação está{" "}
            <span className="font-semibold" style={{ color: "#52B788" }}>acima da média</span>{" "}
            para seu perfil.
          </p>
        </div>
      </HoverCard>

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
