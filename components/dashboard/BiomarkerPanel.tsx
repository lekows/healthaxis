"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HealthMetricCard, MetricsGrid } from "./MetricCards";

export interface PanelItem {
  id: string;
  name: string;
  value: string | number;
  unit: string;
  status: string;
  trend: string;
  category: string;
  lastDate: string;
  slug: string;
  history: { date: string; value: number }[];
  reference?: Record<string, number>;
}

const INITIAL = 23;

export function BiomarkerPanel({ items }: { items: PanelItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, INITIAL);
  const rest = items.length - INITIAL;

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#5A5A50" }}>
        Biomarcadores principais
      </h2>
      <MetricsGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visible.map((b) => (
          <HealthMetricCard
            key={b.id}
            name={b.name}
            value={b.value}
            unit={b.unit}
            status={b.status}
            trend={b.trend}
            category={b.category}
            lastDate={b.lastDate}
            slug={b.slug}
            history={b.history}
            reference={b.reference}
          />
        ))}
      </MetricsGrid>

      {rest > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 mx-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9A9688" }}
        >
          {expanded ? (
            <>Mostrar menos <ChevronUp size={15} /></>
          ) : (
            <>Ver todos os {items.length} biomarcadores <ChevronDown size={15} /></>
          )}
        </button>
      )}
    </div>
  );
}
