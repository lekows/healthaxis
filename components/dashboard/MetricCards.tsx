"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui";
import { HoverCard, AnimatedProgressBar, StaggerContainer, StaggerItem, fadeUp } from "@/lib/motion";
import { getBiomarkerColor, getBiomarkerLabel } from "@/lib/utils";

// ── HealthMetricCard ───────────────────────────────────
interface HealthMetricCardProps {
  name: string; value: string | number; unit: string;
  status: string; trend: string; lastDate: string; category: string;
}

export function HealthMetricCard({ name, value, unit, status, trend, lastDate, category }: HealthMetricCardProps) {
  const color = getBiomarkerColor(status);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const variantMap: Record<string, "success" | "warning" | "danger" | "muted"> = {
    optimal: "success", attention: "warning", risk: "danger"
  };
  const barWidth = status === "optimal" ? 40 : status === "attention" ? 70 : 90;

  return (
    <HoverCard
      className="rounded-3xl p-5 flex flex-col gap-3 cursor-default"
      style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "#5A5A50" }}>{category}</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "#E8E4D9" }}>{name}</p>
        </div>
        <Badge variant={variantMap[status] ?? "muted"}>{getBiomarkerLabel(status)}</Badge>
      </div>

      <div className="flex items-end gap-2">
        <motion.span
          className="text-3xl font-bold"
          style={{ color, fontVariantNumeric: "tabular-nums" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {value}
        </motion.span>
        <span className="text-sm mb-1" style={{ color: "#5A5A50" }}>{unit}</span>
        <motion.div
          className="flex items-center ml-auto mb-1"
          style={{ color }}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <TrendIcon size={13} />
        </motion.div>
      </div>

      <AnimatedProgressBar value={barWidth} color={color} />

      <p className="text-xs" style={{ color: "#5A5A50" }}>
        Atualizado em {new Date(lastDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
      </p>
    </HoverCard>
  );
}

// ── BiomarkerTrendCard ─────────────────────────────────
const DarkTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl px-3 py-2 text-xs shadow-lg"
        style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.1)", color: "#E8E4D9" }}>
        <p style={{ color: "#9A9688" }}>{label}</p>
        <p className="font-semibold">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

interface BiomarkerTrendCardProps {
  name: string; value: number; unit: string;
  status: string; history: { date: string; value: number }[];
}

export function BiomarkerTrendCard({ name, value, unit, status, history }: BiomarkerTrendCardProps) {
  const color = getBiomarkerColor(status);
  const variantMap: Record<string, "success" | "warning" | "danger" | "muted"> = {
    optimal: "success", attention: "warning", risk: "danger"
  };

  return (
    <HoverCard className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{name}</p>
          <div className="flex items-end gap-1 mt-1">
            <motion.span
              className="text-2xl font-bold"
              style={{ color }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              {value}
            </motion.span>
            <span className="text-xs mb-1" style={{ color: "#5A5A50" }}>{unit}</span>
          </div>
        </div>
        <Badge variant={variantMap[status] ?? "muted"}>{getBiomarkerLabel(status)}</Badge>
      </div>

      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <Tooltip content={<DarkTooltip />} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false}
              activeDot={{ r: 4, fill: color, stroke: "#0D0D0B", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs mt-2" style={{ color: "#5A5A50" }}>{history.length} medições</p>
    </HoverCard>
  );
}

// ── BiomarkerGrid — staggered entry ───────────────────
export function BiomarkerGrid({ children }: { children: React.ReactNode }) {
  return (
    <StaggerContainer delay={0.06} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {children}
    </StaggerContainer>
  );
}

export function BiomarkerGridItem({ children }: { children: React.ReactNode }) {
  return <StaggerItem variant={fadeUp}>{children}</StaggerItem>;
}
