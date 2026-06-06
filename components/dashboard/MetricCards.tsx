"use client";
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, X, BarChart2 } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
  ReferenceArea, ReferenceLine, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui";
import { HoverCard, AnimatedProgressBar, StaggerContainer, StaggerItem, fadeUp } from "@/lib/motion";
import { getBiomarkerColor, getBiomarkerLabel } from "@/lib/utils";
import { getBiomarkerInfo } from "@/lib/biomarker-references";

// ── helpers ────────────────────────────────────────────
type HistoryPoint = { date: string; value: number };

function filterByPeriod(history: HistoryPoint[], period: "3m" | "6m" | "all"): HistoryPoint[] {
  if (period === "all" || history.length === 0) return history;
  const months = period === "3m" ? 3 : 6;
  return history.slice(-months);
}

function calcStats(history: HistoryPoint[]) {
  if (!history.length) return { min: 0, max: 0, avg: 0, delta: 0 };
  const vals = history.map(h => h.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
  const delta = history.length > 1 ? Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10 : 0;
  return { min, max, avg, delta };
}

// ── Tooltip ────────────────────────────────────────────
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
          {inRange ? "✓ dentro " : "⚠ fora "}Ref: {refMin ?? 0}–{refMax ?? "∞"}
        </p>
      )}
    </div>
  );
};

// ── Period tabs ─────────────────────────────────────────
type Period = "3m" | "6m" | "all";

function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 p-0.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
      {(["3m", "6m", "all"] as Period[]).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{ color: value === p ? "#E8E4D9" : "#5A5A50" }}
        >
          {value === p && (
            <motion.div layoutId="period-tab" className="absolute inset-0 rounded-lg"
              style={{ background: "rgba(255,255,255,0.1)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{p === "3m" ? "3M" : p === "6m" ? "6M" : "Tudo"}</span>
        </button>
      ))}
    </div>
  );
}

// ── BiomarkerDetailModal ───────────────────────────────
interface DetailModalProps {
  name: string; value: number; unit: string; status: string;
  history: HistoryPoint[]; reference?: Record<string, number>;
  slug?: string; onClose: () => void;
}

function BiomarkerDetailModal({ name, value, unit, status, history, reference, slug, onClose }: DetailModalProps) {
  const [period, setPeriod] = useState<Period>("all");
  const color = getBiomarkerColor(status);
  const info = slug ? getBiomarkerInfo(slug) : undefined;
  const refMin = reference?.min;
  const refMax = reference?.max;
  const filtered = filterByPeriod(history, period);
  const stats = calcStats(filtered);
  const allVals = filtered.map(h => h.value);
  const dataMin = allVals.length ? Math.min(...allVals) : 0;
  const dataMax = allVals.length ? Math.max(...allVals) : 100;
  const yMin = Math.floor(Math.min(dataMin, refMin ?? dataMin) * 0.88);
  const yMax = Math.ceil(Math.max(dataMax, refMax ?? dataMax) * 1.12);

  const variantMap: Record<string, "success" | "warning" | "danger" | "muted"> = {
    optimal: "success", attention: "warning", critical: "danger", high: "danger", low: "warning"
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-4 bottom-4 top-16 lg:inset-x-auto lg:right-0 lg:top-0 lg:bottom-0 lg:w-[480px] z-50 overflow-y-auto"
        style={{ background: "#141412", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)" }}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#5A5A50" }}>Biomarcador</p>
              <h2 className="text-lg font-bold" style={{ color: "#E8E4D9" }}>{name}</h2>
              <div className="flex items-end gap-1.5 mt-1">
                <span className="text-3xl font-bold" style={{ color }}>{value}</span>
                <span className="text-sm mb-1" style={{ color: "#5A5A50" }}>{unit}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={variantMap[status] ?? "muted"}>{getBiomarkerLabel(status)}</Badge>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:opacity-70 transition-opacity" style={{ color: "#5A5A50" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Explainer */}
          {info && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-base shrink-0" style={{ color }}>ⓘ</span>
              <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>{info}</p>
            </div>
          )}

          {/* Stats + Chart — só quando há histórico */}
          {history.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Mínimo", val: stats.min },
                  { label: "Médio", val: stats.avg },
                  { label: "Máximo", val: stats.max },
                  { label: "Variação", val: stats.delta, prefix: stats.delta > 0 ? "+" : "" },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-2xl text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-xs mb-1" style={{ color: "#5A5A50" }}>{s.label}</p>
                    <p className="text-sm font-bold" style={{
                      color: s.prefix !== undefined && s.val !== 0 ? (s.val > 0 ? "#F4A261" : "#52B788") : "#E8E4D9"
                    }}>
                      {s.prefix ?? ""}{s.val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-medium" style={{ color: "#9A9688" }}>{filtered.length} medições</p>
                  <PeriodTabs value={period} onChange={setPeriod} />
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                      {refMin !== undefined && refMax !== undefined && (
                        <ReferenceArea y1={refMin} y2={refMax} fill="#52B788" fillOpacity={0.07} />
                      )}
                      {refMax !== undefined && (
                        <ReferenceLine y={refMax} stroke="#F4A261" strokeDasharray="4 3" strokeOpacity={0.5} strokeWidth={1} />
                      )}
                      {refMin !== undefined && (
                        <ReferenceLine y={refMin} stroke="#F4A261" strokeDasharray="4 3" strokeOpacity={0.5} strokeWidth={1} />
                      )}
                      <XAxis dataKey="date" tick={{ fill: "#5A5A50", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis domain={[yMin, yMax]} tick={{ fill: "#5A5A50", fontSize: 9 }} tickLine={false} axisLine={false} width={32} />
                      <Tooltip content={<DarkTooltip unit={unit} refMin={refMin} refMax={refMax} />} />
                      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5}
                        dot={{ r: 3, fill: color, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: color, stroke: "#0D0D0B", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Reference range */}
          {(refMin !== undefined || refMax !== undefined) && (
            <div className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.15)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "#52B788", flexShrink: 0 }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "#52B788" }}>Faixa de referência</p>
                <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>{refMin ?? 0} – {refMax ?? "∞"} {unit}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── HealthMetricCard ───────────────────────────────────
interface HealthMetricCardProps {
  name: string; value: string | number; unit: string;
  status: string; trend: string; lastDate: string; category: string;
  slug?: string; history?: HistoryPoint[]; reference?: Record<string, number>;
}

export function HealthMetricCard({ name, value, unit, status, trend, lastDate, category, slug, history, reference }: HealthMetricCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const color = getBiomarkerColor(status);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const variantMap: Record<string, "success" | "warning" | "danger" | "muted"> = {
    optimal: "success", attention: "warning", risk: "danger", critical: "danger", high: "danger", low: "warning"
  };
  const barWidth = status === "optimal" ? 40 : status === "attention" ? 70 : 90;
  const hasHistory = history && history.length > 0;

  return (
    <>
      <HoverCard
        className="rounded-3xl p-5 flex flex-col gap-3"
        style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer" }}
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "#5A5A50" }}>{category}</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "#E8E4D9" }}>{name}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={variantMap[status] ?? "muted"}>{getBiomarkerLabel(status)}</Badge>
            {hasHistory && <BarChart2 size={11} style={{ color: "#5A5A50" }} />}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <motion.span className="text-3xl font-bold"
            style={{ color, fontVariantNumeric: "tabular-nums" }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {value}
          </motion.span>
          <span className="text-sm mb-1" style={{ color: "#5A5A50" }}>{unit}</span>
          <motion.div className="flex items-center ml-auto mb-1" style={{ color }}
            animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <TrendIcon size={13} />
          </motion.div>
        </div>
        <AnimatedProgressBar value={barWidth} color={color} />
        <p className="text-xs" style={{ color: "#5A5A50" }}>
          {hasHistory
            ? `${history.length} medições · toque para detalhes`
            : `Atualizado em ${new Date(lastDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
          }
        </p>
      </HoverCard>

      <AnimatePresence>
        {showDetail && (
          <BiomarkerDetailModal
            name={name} value={Number(value)} unit={unit} status={status}
            history={history ?? []} reference={reference} slug={slug}
            onClose={() => setShowDetail(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── BiomarkerTrendCard ─────────────────────────────────
interface BiomarkerTrendCardProps {
  name: string; value: number; unit: string; status: string;
  history: HistoryPoint[]; reference?: Record<string, number>; slug?: string;
}

export function BiomarkerTrendCard({ name, value, unit, status, history, reference, slug }: BiomarkerTrendCardProps) {
  const [period, setPeriod] = useState<Period>("all");
  const [showDetail, setShowDetail] = useState(false);
  const color = getBiomarkerColor(status);
  const variantMap: Record<string, "success" | "warning" | "danger" | "muted"> = {
    optimal: "success", attention: "warning", risk: "danger", critical: "danger", high: "danger", low: "warning"
  };
  const refMin = reference?.min;
  const refMax = reference?.max;
  const filtered = filterByPeriod(history, period);
  const allVals = filtered.map(h => h.value);
  const dataMin = allVals.length ? Math.min(...allVals) : 0;
  const dataMax = allVals.length ? Math.max(...allVals) : 100;
  const yMin = Math.floor(Math.min(dataMin, refMin ?? dataMin) * 0.9);
  const yMax = Math.ceil(Math.max(dataMax, refMax ?? dataMax) * 1.1);

  return (
    <>
      <HoverCard className="rounded-3xl p-5 cursor-pointer" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}
        onClick={() => setShowDetail(true)}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{name}</p>
            <div className="flex items-end gap-1 mt-1">
              <motion.span className="text-2xl font-bold" style={{ color }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                {value}
              </motion.span>
              <span className="text-xs mb-1" style={{ color: "#5A5A50" }}>{unit}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={variantMap[status] ?? "muted"}>{getBiomarkerLabel(status)}</Badge>
            <BarChart2 size={12} style={{ color: "#5A5A50" }} />
          </div>
        </div>

        {/* Period selector — stops propagation so click doesn't open modal */}
        <div className="flex justify-end mb-2" onClick={e => e.stopPropagation()}>
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>

        <div className="h-32 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              {refMin !== undefined && refMax !== undefined && (
                <ReferenceArea y1={refMin} y2={refMax} fill="#52B788" fillOpacity={0.08} />
              )}
              {refMax !== undefined && (
                <ReferenceLine y={refMax} stroke="#F4A261" strokeDasharray="4 3" strokeOpacity={0.45} strokeWidth={1} />
              )}
              {refMin !== undefined && (
                <ReferenceLine y={refMin} stroke="#F4A261" strokeDasharray="4 3" strokeOpacity={0.45} strokeWidth={1} />
              )}
              <XAxis dataKey="date" tick={{ fill: "#5A5A50", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[yMin, yMax]} tick={{ fill: "#5A5A50", fontSize: 9 }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<DarkTooltip unit={unit} refMin={refMin} refMax={refMax} />} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2}
                dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: color, stroke: "#0D0D0B", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs" style={{ color: "#5A5A50" }}>{filtered.length} medições · toque para detalhes</p>
          {(refMin !== undefined || refMax !== undefined) && (
            <p className="text-xs" style={{ color: "#5A5A50" }}>Ref: {refMin ?? 0}–{refMax ?? "∞"} {unit}</p>
          )}
        </div>
      </HoverCard>

      <AnimatePresence>
        {showDetail && (
          <BiomarkerDetailModal
            name={name} value={value} unit={unit} status={status}
            history={history} reference={reference} slug={slug}
            onClose={() => setShowDetail(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── MetricsGrid ────────────────────────────────────────
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
