"use client";

import { useState } from "react";
import Link from "next/link";
import { DoctorInviteQR } from "./DoctorInviteQR";
import { UserPlus, Users, ChevronRight } from "lucide-react";
import type { DoctorInvite, LinkedPatient } from "@/lib/supabase/doctor-queries";

interface Props {
  initialInvite: DoctorInvite | null;
  patients: LinkedPatient[];
  baseUrl: string;
}

export function DoctorDashboardClient({ initialInvite, patients, baseUrl }: Props) {
  const [invite, setInvite] = useState<DoctorInvite | null>(initialInvite);
  const [loading, setLoading] = useState(false);

  async function generateInvite() {
    setLoading(true);
    const res = await fetch("/api/doctor/invite", { method: "POST" });
    const data = await res.json();
    if (data.token) setInvite({ id: data.id, token: data.token, expires_at: data.expires_at, used_at: null, used_by: null, created_at: new Date().toISOString() });
    setLoading(false);
  }

  async function revokeInvite() {
    setLoading(true);
    if (invite?.id) await fetch("/api/doctor/invite", { method: "DELETE", body: JSON.stringify({ inviteId: invite.id }), headers: { "Content-Type": "application/json" } });
    setInvite(null);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      {/* Convite */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
          <UserPlus size={14} style={{ color: "#52B788" }} /> Convite para paciente
        </h2>

        {invite ? (
          <DoctorInviteQR
            token={invite.token}
            expiresAt={invite.expires_at}
            baseUrl={baseUrl}
            onRevoke={revokeInvite}
            onGenerate={generateInvite}
            loading={loading}
          />
        ) : (
          <div className="rounded-3xl p-6 text-center space-y-4" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-sm" style={{ color: "#9A9688" }}>
              Gere um QR de convite para que seu paciente possa se vincular a você.
            </p>
            <button
              onClick={generateInvite}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#52B788", color: "#0D0D0B" }}
            >
              {loading ? "Gerando…" : "Gerar convite"}
            </button>
          </div>
        )}
      </div>

      {/* Pacientes */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
          <Users size={14} style={{ color: "#52B788" }} /> Pacientes vinculados ({patients.length})
        </h2>

        {patients.length === 0 ? (
          <p className="text-sm" style={{ color: "#5A5A50" }}>Nenhum paciente vinculado ainda.</p>
        ) : (
          <div className="space-y-3">
            {patients.map((p) => (
              <Link key={p.id} href={`/doctor/patient/${p.patient_id}`}
                className="flex items-center justify-between px-4 py-3 rounded-2xl transition-all hover:opacity-80"
                style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{p.patient?.name ?? "Paciente"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>
                    Vinculado em {new Date(p.consent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#52B788" }} title="Ativo" />
                  <ChevronRight size={16} style={{ color: "#5A5A50" }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
