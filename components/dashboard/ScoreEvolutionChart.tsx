"use client";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

interface ScorePoint {
  label: string;
  overall: number;
  metabolic: number;
  cardiovascular: number;
  lifestyle: number;
  preventive: number;
}

interface Props {
  data: ScorePoint[];
  current: { overall: number; metabolic: number; cardiovascular: number; lifestyle: number; preventive: number };
}

const LINES = [
  { key: "overall", label: "Geral", color: "#52B788" },
  { key: "metabolic", label: "Metabólico", color: "#F4A261" },
  { key: "cardiovascular", label: "Cardiovascular", color: "#C1440E" },
  { key: "lifestyle", label: "Estilo de vida", color: "#9A9688" },
  { key: "preventive", label: "Preventivo", color: "#E8E4D9" },
] as const;

type LineKey = typeof LINES[number]["key"];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl px-3 py-2 text-xs shadow-lg space-y-1"
      style={{ background: "#1C1C19", border: "1px solid rgba(255,255,255,0.12)", color: "#E8E4D9" }}>
      <p style={{ color: "#9A9688" }} className="mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "#9A9688" }}>{LINES.find(l => l.key === p.dataKey)?.label}</span>
          <span className="font-bold ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ScoreEvolutionChart({ data, current }: Props) {
  const [hidden, setHidden] = useState<Set<LineKey>>(new Set());

  function toggleLine(key: LineKey) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const dimensions = [
    { label: "Metabólico", val: current.metabolic, color: "#F4A261" },
    { label: "Cardiovascular", val: current.cardiovascular, color: "#C1440E" },
    { label: "Estilo de vida", val: current.lifestyle, color: "#9A9688" },
    { label: "Preventivo", val: current.preventive, color: "#E8E4D9" },
  ];

  return (
    <div className="space-y-6">
      {/* Dimension score cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {dimensions.map(d => (
          <motion.div key={d.label} className="p-4 rounded-3xl"
            style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#5A5A50" }}>{d.label}</p>
            <p className="text-2xl font-bold" style={{ color: d.color }}>{d.val}</p>
            <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: d.color }}
                initial={{ width: 0 }}
                animate={{ width: `${d.val}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Evolution chart */}
      {data.length > 1 ? (
        <div className="p-5 rounded-3xl overflow-hidden" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#5A5A50" }}>Evolução histórica</p>
            <p className="text-xs" style={{ color: "#5A5A50" }}>Toque na legenda para filtrar</p>
          </div>

          {/* Toggleable legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {LINES.map(l => {
              const active = !hidden.has(l.key);
              return (
                <button key={l.key} onClick={() => toggleLine(l.key)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all"
                  style={{
                    background: active ? "rgba(255,255,255,0.06)" : "transparent",
                    border: `1px solid ${active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`,
                    color: active ? "#E8E4D9" : "#5A5A50",
                  }}>
                  <span className="w-2 h-0.5 rounded" style={{ background: active ? l.color : "#5A5A50" }} />
                  {l.label}
                </button>
              );
            })}
          </div>

          <div className="h-52 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                <XAxis dataKey="label" tick={{ fill: "#5A5A50", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#5A5A50", fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                {LINES.filter(l => !hidden.has(l.key)).map(l => (
                  <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color}
                    strokeWidth={l.key === "overall" ? 2.5 : 1.5}
                    dot={{ r: 2, fill: l.color, strokeWidth: 0 }}
                    activeDot={{ r: 4, stroke: "#0D0D0B", strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-3xl text-center" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-xs" style={{ color: "#5A5A50" }}>Histórico de evolução disponível após múltiplas avaliações.</p>
        </div>
      )}
    </div>
  );
}
