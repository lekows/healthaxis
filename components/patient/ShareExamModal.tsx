"use client";

import { useState } from "react";
import { X, QrCode, Check } from "lucide-react";
import QRCode from "react-qr-code";

interface Document {
  id: string;
  title: string;
  date: string;
  lab?: string | null;
}

interface Props {
  documents: Document[];
  baseUrl: string;
}

const EXPIRY_OPTIONS = [
  { label: "30 minutos", hours: 0.5 },
  { label: "2 horas", hours: 2 },
  { label: "24 horas", hours: 24 },
  { label: "7 dias", hours: 168 },
];

export function ShareExamModal({ documents, baseUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function generateShare() {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: [...selected], expiresInHours }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Erro ao gerar QR."); setLoading(false); return; }
    setShareToken(data.token);
    setLoading(false);
  }

  function reset() {
    setShareToken(null);
    setSelected(new Set());
    setError(null);
  }

  const shareUrl = shareToken ? `${baseUrl}/share/${shareToken}` : "";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: "#52B788", color: "#0D0D0B" }}
      >
        <QrCode size={15} /> Compartilhar exames
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.09)" }}>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "#E8E4D9" }}>
                {shareToken ? "QR de Compartilhamento" : "Compartilhar Exames"}
              </h2>
              <button onClick={() => { setOpen(false); reset(); }}
                className="p-1.5 rounded-xl hover:opacity-70" style={{ color: "#9A9688" }}>
                <X size={16} />
              </button>
            </div>

            {shareToken ? (
              <div className="space-y-4">
                <div className="flex justify-center p-4 rounded-2xl" style={{ background: "#ffffff" }}>
                  <QRCode value={shareUrl} size={200} />
                </div>
                <p className="text-xs text-center" style={{ color: "#9A9688" }}>
                  Mostre este QR ao médico ou copie o link abaixo.
                </p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-xs flex-1 truncate" style={{ color: "#9A9688" }}>{shareUrl}</span>
                  <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="shrink-0 hover:opacity-70">
                    <Check size={13} style={{ color: "#52B788" }} />
                  </button>
                </div>
                <button onClick={reset} className="w-full py-2.5 rounded-2xl text-sm font-medium hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#9A9688" }}>
                  Gerar outro
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm" style={{ color: "#9A9688" }}>Selecione os documentos que deseja compartilhar com o médico.</p>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {documents.map(doc => (
                    <label key={doc.id} className="flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all"
                      style={{ background: selected.has(doc.id) ? "rgba(82,183,136,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${selected.has(doc.id) ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                      <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggle(doc.id)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#E8E4D9" }}>{doc.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>
                          {new Date(doc.date).toLocaleDateString("pt-BR")}{doc.lab ? ` · ${doc.lab}` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "#9A9688" }}>Expiração do link</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EXPIRY_OPTIONS.map(opt => (
                      <button key={opt.hours} onClick={() => setExpiresInHours(opt.hours)}
                        className="py-1.5 rounded-xl text-xs font-medium transition-all"
                        style={{ background: expiresInHours === opt.hours ? "rgba(82,183,136,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${expiresInHours === opt.hours ? "rgba(82,183,136,0.3)" : "rgba(255,255,255,0.07)"}`, color: expiresInHours === opt.hours ? "#52B788" : "#9A9688" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm" style={{ color: "#C1440E" }}>{error}</p>}

                <button
                  onClick={generateShare}
                  disabled={selected.size === 0 || loading}
                  className="w-full py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: "#52B788", color: "#0D0D0B" }}
                >
                  {loading ? "Gerando QR…" : `Gerar QR (${selected.size} doc${selected.size !== 1 ? "s" : ""})`}
                </button>

                <p className="text-xs text-center" style={{ color: "#5A5A50" }}>
                  Você inicia o compartilhamento. O médico nunca acessa seus dados sem sua autorização explícita.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
