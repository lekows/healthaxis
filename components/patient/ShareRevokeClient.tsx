"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import type { SharedExamToken } from "@/lib/supabase/doctor-queries";

interface Props {
  tokens: SharedExamToken[];
  baseUrl: string;
}

export function ShareRevokeClient({ tokens: initialTokens, baseUrl }: Props) {
  const [tokens, setTokens] = useState(initialTokens);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function revoke(tokenId: string) {
    setRevoking(tokenId);
    const res = await fetch("/api/share", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId }),
    });
    if (res.ok) setTokens(t => t.filter(x => x.id !== tokenId));
    setRevoking(null);
  }

  if (tokens.length === 0) return null;

  return (
    <div className="space-y-3">
      {tokens.map(t => {
        const expiry = new Date(t.expires_at);
        const expired = expiry < new Date();
        return (
          <div key={t.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl"
            style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3">
              <Clock size={14} style={{ color: "#9A9688" }} />
              <div>
                <p className="text-sm" style={{ color: "#E8E4D9" }}>
                  {t.document_ids.length} doc{t.document_ids.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs mt-0.5" style={{ color: expired ? "#C1440E" : "#5A5A50" }}>
                  {expired ? "Expirado" : `Expira ${expiry.toLocaleDateString("pt-BR")}`}
                  {t.viewed_at ? ` · Visualizado ${new Date(t.viewed_at).toLocaleDateString("pt-BR")}` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => revoke(t.id)}
              disabled={revoking === t.id}
              className="p-1.5 rounded-xl transition-all hover:opacity-80 disabled:opacity-40"
              style={{ color: "#C1440E" }}
              title="Revogar"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
