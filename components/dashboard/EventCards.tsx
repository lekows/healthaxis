"use client";
import { Calendar, FlaskConical, ClipboardList, Activity, Syringe, Pill, AlertCircle, CheckCircle2, FileText, Image, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui";
import { HoverCard, AnimatedProgressBar } from "@/lib/motion";

// ── PreventiveReminderCard ─────────────────────────────
interface ReminderProps { title: string; description: string; daysUntil: number; priority: string; }

export function PreventiveReminderCard({ title, description, daysUntil, priority }: ReminderProps) {
  const urgent = daysUntil <= 30;
  return (
    <HoverCard
      className="flex items-start gap-4 p-4 rounded-2xl"
      style={{
        background: urgent ? "rgba(193,68,14,0.07)" : "rgba(255,255,255,0.02)",
        border: urgent ? "1px solid rgba(193,68,14,0.18)" : "1px solid rgba(255,255,255,0.06)"
      }}
    >
      <motion.div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: urgent ? "rgba(193,68,14,0.12)" : "rgba(82,183,136,0.1)" }}
        animate={urgent ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {urgent
          ? <AlertCircle size={15} style={{ color: "#C1440E" }} />
          : <CheckCircle2 size={15} style={{ color: "#52B788" }} />
        }
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate" style={{ color: "#E8E4D9" }}>{title}</p>
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: urgent ? "#C1440E" : "#5A5A50" }}>
            {daysUntil <= 0 ? "Hoje" : `em ${daysUntil}d`}
          </span>
        </div>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#9A9688" }}>{description}</p>
      </div>
    </HoverCard>
  );
}

// ── TimelineEventCard ──────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
  flask: FlaskConical, consult: ClipboardList, heart: Activity,
  vaccine: Syringe, pill: Pill, scan: Activity,
  calendar: Calendar, clipboard: ClipboardList, stethoscope: ClipboardList,
  syringe: Syringe, activity: Activity
};

const typeStyles: Record<string, { bg: string; color: string }> = {
  exam: { bg: "rgba(82,183,136,0.1)", color: "#52B788" },
  consult: { bg: "rgba(99,102,241,0.1)", color: "#818CF8" },
  checkup: { bg: "rgba(193,68,14,0.1)", color: "#C1440E" },
  vaccine: { bg: "rgba(167,139,250,0.1)", color: "#A78BFA" }
};

interface TimelineEventProps {
  date: string; type: string; title: string;
  description: string; icon: string; isLast?: boolean;
}

export function TimelineEventCard({ date, type, title, description, icon, isLast }: TimelineEventProps) {
  const Icon = iconMap[icon] ?? Activity;
  const s = typeStyles[type] ?? { bg: "rgba(255,255,255,0.05)", color: "#9A9688" };

  return (
    <motion.div
      className="flex gap-4"
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col items-center">
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: s.bg }}
          whileHover={{ scale: 1.15 }}
        >
          <Icon size={14} style={{ color: s.color }} />
        </motion.div>
        {!isLast && <div className="w-px flex-1 mt-2" style={{ background: "rgba(255,255,255,0.06)" }} />}
      </div>
      <div className={`pb-6 flex-1 ${isLast ? "pb-0" : ""}`}>
        <p className="text-xs mb-1" style={{ color: "#5A5A50" }}>
          {new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{title}</p>
        <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#9A9688" }}>{description}</p>
      </div>
    </motion.div>
  );
}

// ── RecentDocumentCard ────────────────────────────────
const docIcons: Record<string, React.ElementType> = {
  "Exame Laboratorial": FlaskConical,
  "Laudo Médico": FileText,
  "Exame de Imagem": Image
};

interface DocumentCardProps { title: string; type: string; date: string; lab: string; status: string; tags: string[]; }

export function RecentDocumentCard({ title, type, date, lab, status, tags }: DocumentCardProps) {
  const Icon = docIcons[type] ?? FileText;
  return (
    <HoverCard
      className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(82,183,136,0.08)" }}>
        <Icon size={14} style={{ color: "#52B788" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate" style={{ color: "#E8E4D9" }}>{title}</p>
          {status === "reviewed"
            ? <CheckCircle size={13} style={{ color: "#52B788", flexShrink: 0 }} />
            : <Clock size={13} style={{ color: "#C1440E", flexShrink: 0 }} />
          }
        </div>
        <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>
          {lab} · {new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </p>
        <div className="flex gap-1 mt-2 flex-wrap">
          {tags.slice(0, 2).map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", color: "#5A5A50", border: "1px solid rgba(255,255,255,0.07)" }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </HoverCard>
  );
}

// ── RiskAreaCard ──────────────────────────────────────
interface RiskAreaProps { label: string; score: number; description: string; color: "green" | "yellow" | "red"; }

const riskConfig = {
  green: { bar: "#52B788", bg: "rgba(82,183,136,0.06)", border: "rgba(82,183,136,0.12)", text: "#52B788", badge: "Baixo risco" },
  yellow: { bar: "#F4A261", bg: "rgba(244,162,97,0.06)", border: "rgba(244,162,97,0.15)", text: "#F4A261", badge: "Atenção" },
  red: { bar: "#C1440E", bg: "rgba(193,68,14,0.06)", border: "rgba(193,68,14,0.15)", text: "#C1440E", badge: "Risco elevado" }
};

export function RiskAreaCard({ label, score, description, color }: RiskAreaProps) {
  const s = riskConfig[color];
  return (
    <motion.div
      className="rounded-2xl p-4"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{label}</p>
        <span className="text-xs font-medium" style={{ color: s.text }}>{s.badge}</span>
      </div>
      <AnimatedProgressBar value={score} color={s.bar} />
      <p className="text-xs leading-relaxed mt-2" style={{ color: "#9A9688" }}>{description}</p>
    </motion.div>
  );
}
