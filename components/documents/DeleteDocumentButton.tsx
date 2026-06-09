"use client";

import { useState } from "react";
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

  if (state === "loading") {
    return <Loader2 size={14} className="animate-spin" style={{ color: "#5A5A50" }} />;
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
