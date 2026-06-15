"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteDocument } from "@/app/documents/actions";

interface Props {
  documentId: string;
  documentTitle: string;
}

export function DeleteDocumentButton({ documentId, documentTitle }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirming" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state !== "loading") { setElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [state]);

  async function handleConfirm() {
    setState("loading");
    const result = await deleteDocument(documentId);
    if (result.error) {
      setError(result.error);
      setState("idle");
      return;
    }
    router.refresh();
  }

  if (state === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
        <div className="w-full max-w-sm flex flex-col items-center gap-3 rounded-3xl px-6 py-8 text-center"
          style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Loader2 size={28} className="animate-spin" style={{ color: "#52B788" }} />
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Excluindo exame…</p>
            <p className="text-xs" style={{ color: "#9A9688" }}>
              Atualizando biomarcadores e indicadores. Isso pode levar alguns segundos.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums" style={{ color: "#5A5A50" }}>{elapsed}s</span>
        </div>
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: "#9A9688" }}>Excluir?</span>
        <button
          onClick={handleConfirm}
          className="text-xs px-2 py-0.5 rounded-lg font-medium transition-colors"
          style={{ background: "rgba(193,68,14,0.12)", color: "#C1440E", border: "1px solid rgba(193,68,14,0.2)" }}>
          Sim
        </button>
        <button
          onClick={() => { setState("idle"); setError(null); }}
          className="text-xs px-2 py-0.5 rounded-lg font-medium transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", color: "#5A5A50", border: "1px solid rgba(255,255,255,0.08)" }}>
          Não
        </button>
        {error && <span className="text-xs" style={{ color: "#C1440E" }}>{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setState("confirming")}
      title={`Excluir "${documentTitle}"`}
      className="p-1 rounded-lg transition-colors hover:bg-white/5 group"
      style={{ color: "#5A5A50" }}>
      <Trash2 size={14} className="group-hover:text-red-500 transition-colors"
        style={{ color: "inherit" }} />
    </button>
  );
}
