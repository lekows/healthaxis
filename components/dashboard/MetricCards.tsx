"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
  ReferenceArea, ReferenceLine, XAxis, YAxis,
} from "recharts";
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
    optimal: "success", attention: "warning", risk: "danger", critical: "danger", high: "danger", low: "warning"
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
interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit?: string;
  refMin?: number;
  refMax?: number;
}

const DarkTooltip = ({ active, payload, label, unit, refMin, refMax }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const inRange = (refMin === undefined || val >= refMin) && (refMax === undefined || val <= refMax);
  const hasRef = refMin !== undefined || refMax !== undefined;

  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.12)", color: "#E8E4D9" }}>
      <p style={{ color: "#9A9688" }} className="mb-1">{label}</p>
      <p className="font-bold text-sm">{val} {unit}</p>
      {hasRef && (
        <p className="mt-1" style={{ color: inRange ? "#52B788" : "#F4A261" }}>
          {inRange ? "✓ dentro " : "⚠ fora "}
          Ref: {refMin ?? 0}–{refMax ?? "∞"}
        </p>
      )}
    </div>
  );
};

interface BiomarkerTrendCardProps {
  name: string;
  value: number;
  unit: string;
  status: string;
  history: { date: string; value: number }[];
  reference?: Record<string, number>;
}

export function BiomarkerTrendCard({ name, value, unit, status, history, reference }: BiomarkerTrendCardProps) {
  const color = getBiomarkerColor(status);
  const variantMap: Record<string, "success" | "warning" | "danger" | "muted"> = {
    optimal: "success", attention: "warning", risk: "danger", critical: "danger", high: "danger", low: "warning"
  };

  const refMin = reference?.min;
  const refMax = reference?.max;

  // Calcula domínio Y com margem para incluir faixa de referência
  const allValues = history.map(h => h.value);
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const yMin = Math.floor(Math.min(dataMin, refMin ?? dataMin) * 0.9);
  const yMax = Math.ceil(Math.max(dataMax, refMax ?? dataMax) * 1.1);

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

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>

            {/* Faixa de referência normal */}
            {refMin !== undefined && refMax !== undefined && (
              <ReferenceArea y1={refMin} y2={refMax} fill="#52B788" fillOpacity={0.08} />
            )}

            {/* Linhas de limite */}
            {refMax !== undefined && (
              <ReferenceLine y={refMax} stroke="#F4A261" strokeDasharray="4 3" strokeOpacity={0.45} strokeWidth={1} />
            )}
            {refMin !== undefined && (
              <ReferenceLine y={refMin} stroke="#F4A261" strokeDasharray="4 3" strokeOpacity={0.45} strokeWidth={1} />
            )}

            <XAxis
              dataKey="date"
              tick={{ fill: "#5A5A50", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "#5A5A50", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip content={<DarkTooltip unit={unit} refMin={refMin} refMax={refMax} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: color, stroke: "#0D0D0B", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs" style={{ color: "#5A5A50" }}>{history.length} medições</p>
        {(refMin !== undefined || refMax !== undefined) && (
          <p className="text-xs" style={{ color: "#5A5A50" }}>
            Ref: {refMin ?? 0}–{refMax ?? "∞"} {unit}
          </p>
        )}
      </div>
    </HoverCard>
  );
}

// ── MetricsGrid — wrapper genérico com className ──────
export function MetricsGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
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
