"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { DoctorInviteQR } from "./DoctorInviteQR";
import type { DoctorInvite } from "@/lib/supabase/doctor-queries";

export function InvitePanel({ initialInvite, baseUrl }: { initialInvite: DoctorInvite | null; baseUrl: string }) {
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
  );
}
