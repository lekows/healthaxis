"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";
import { MetabolicInsightsCard } from "./MetabolicInsightsCard";

type Run = {
  id: string;
  output_json: unknown;
  confidence_score: number | null;
  completed_at: string | null;
};

interface Props {
  initialRun: Run | null;
}

export function MetabolicAnalysisSection({ initialRun }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/metabolic-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `erro ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {initialRun ? (
        <>
          <MetabolicInsightsCard
            run={initialRun}
            onReanalisar={handleAnalyze}
            loadingReanalisar={loading}
          />
          {error && <p className="text-xs" style={{ color: "#C1440E" }}>{error}</p>}
        </>
      ) : (
        <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Activity size={15} style={{ color: "#52B788" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Padrões metabólicos</p>
                <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>
                  Identifica padrões bioquímicos a partir dos seus biomarcadores.
                </p>
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.25)" }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
              {loading ? "Analisando…" : "Analisar"}
            </button>
          </div>
          {error && <p className="text-xs mt-3" style={{ color: "#C1440E" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
