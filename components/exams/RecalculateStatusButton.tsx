"use client";
import { useState } from "react";
import { recalculateAllBiomarkerStatuses } from "@/app/documents/actions";
import { RefreshCw } from "lucide-react";

export function RecalculateStatusButton({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleClick() {
    setState("loading");
    await recalculateAllBiomarkerStatuses();
    setState("done");
    setTimeout(() => setState("idle"), 3000);
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium transition-colors"
      style={{
        color: state === "done" ? "#52B788" : "#9A9688",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <RefreshCw size={14} className={state === "loading" ? "animate-spin" : ""} />
      {compact
        ? (state === "done" ? "✓" : state === "loading" ? "…" : "Status")
        : (state === "done" ? "Atualizado!" : state === "loading" ? "Atualizando..." : "Atualizar status")}
    </button>
  );
}
