"use client";

import { useState } from "react";
import { Stethoscope, Link2Off, Eye } from "lucide-react";
import type { LinkedDoctor } from "@/lib/supabase/doctor-queries";

interface WatchedEntry {
  slug: string;
  name: string;
}

interface Props {
  linkedDoctors: LinkedDoctor[];
  watchedByDoctor?: Record<string, WatchedEntry[]>;
}

export function LinkedDoctorSection({ linkedDoctors, watchedByDoctor = {} }: Props) {
  const [doctors, setDoctors] = useState(linkedDoctors);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function revoke(linkId: string) {
    setRevoking(linkId);
    const res = await fetch("/api/doctor/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    });
    if (res.ok) setDoctors(d => d.filter(x => x.id !== linkId));
    setRevoking(null);
  }

  if (doctors.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
        <Stethoscope size={14} style={{ color: "#52B788" }} /> Médicos vinculados
      </h2>
      <div className="space-y-3">
        {doctors.map((link) => {
          const doctorName = link.doctor?.name ?? "Médico";
          const dp = link.doctor?.doctor_profiles?.[0];
          const crmLabel = dp ? `CRM ${dp.crm}/${dp.crm_uf}${dp.specialty ? ` · ${dp.specialty}` : ""}` : "";
          const watched = watchedByDoctor[link.doctor_id] ?? [];

          return (
            <div key={link.id} className="rounded-2xl overflow-hidden"
              style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>

              {/* Cabeçalho do médico */}
              <div className="flex items-center justify-between gap-4 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
                    <Stethoscope size={16} style={{ color: "#52B788" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{doctorName}</p>
                    {crmLabel && <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>{crmLabel}</p>}
                    <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>
                      Vinculado em {new Date(link.consent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => revoke(link.id)}
                  disabled={revoking === link.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40 shrink-0"
                  style={{ background: "rgba(193,68,14,0.08)", border: "1px solid rgba(193,68,14,0.2)", color: "#C1440E" }}
                >
                  <Link2Off size={12} />
                  {revoking === link.id ? "Revogando…" : "Revogar"}
                </button>
              </div>

              {/* Marcadores monitorados pelo médico */}
              {watched.length > 0 && (
                <div className="px-4 pb-4 pt-0">
                  <div className="border-t pt-3 flex flex-wrap gap-2 items-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: "#5A5A50" }}>
                      <Eye size={11} />
                      Acompanhando:
                    </span>
                    {watched.map((w) => (
                      <span
                        key={w.slug}
                        className="px-2 py-0.5 rounded-lg text-xs font-medium"
                        style={{
                          background: "rgba(82,183,136,0.08)",
                          border: "1px solid rgba(82,183,136,0.18)",
                          color: "#9A9688",
                        }}
                      >
                        {w.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs mt-3" style={{ color: "#5A5A50" }}>
        Ao revogar, o médico perde acesso imediato. Seus dados de saúde não são afetados.
      </p>
    </div>
  );
}
