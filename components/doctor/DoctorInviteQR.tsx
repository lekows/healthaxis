"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { Copy, Check, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  token: string;
  expiresAt: string;
  baseUrl: string;
  onRevoke: (inviteId?: string) => void;
  onGenerate: () => void;
  loading?: boolean;
}

export function DoctorInviteQR({ token, expiresAt, baseUrl, onRevoke, onGenerate, loading }: Props) {
  const [copied, setCopied] = useState(false);
  const url = `${baseUrl}/connect/${token}`;

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const expiryLabel = new Date(expiresAt).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div className="rounded-3xl p-6 space-y-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>QR de Convite</p>
          <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>Válido até {expiryLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="p-2 rounded-xl transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
            title="Gerar novo convite"
          >
            <RefreshCw size={14} style={{ color: "#9A9688" }} />
          </button>
          <button
            onClick={() => onRevoke()}
            className="p-2 rounded-xl transition-all hover:opacity-80"
            style={{ background: "rgba(193,68,14,0.08)", border: "1px solid rgba(193,68,14,0.2)" }}
            title="Revogar convite"
          >
            <Trash2 size={14} style={{ color: "#C1440E" }} />
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex justify-center p-4 rounded-2xl" style={{ background: "#ffffff" }}>
        <QRCode value={url} size={180} />
      </div>

      {/* Link copiável */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="text-xs flex-1 truncate" style={{ color: "#9A9688" }}>{url}</span>
        <button onClick={copyLink} className="shrink-0 transition-all hover:opacity-80">
          {copied
            ? <Check size={14} style={{ color: "#52B788" }} />
            : <Copy size={14} style={{ color: "#9A9688" }} />}
        </button>
      </div>

      <p className="text-xs text-center" style={{ color: "#5A5A50" }}>
        Mostre este QR ao paciente ou envie o link. O vínculo só é criado após o paciente aceitar explicitamente.
      </p>
    </div>
  );
}
