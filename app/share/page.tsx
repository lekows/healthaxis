import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile, getDocuments } from "@/lib/supabase/queries";
import { getMySharedTokens } from "@/lib/supabase/doctor-queries";
import { ShareExamModal } from "@/components/patient/ShareExamModal";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { QrCode, Clock, X } from "lucide-react";
import { ShareRevokeClient } from "@/components/patient/ShareRevokeClient";
import { headers } from "next/headers";

export default async function SharePage() {
  const [profile, documents, tokens] = await Promise.all([
    getProfile(),
    getDocuments(),
    getMySharedTokens(),
  ]);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3002";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${proto}://${host}`;

  const labDocs = documents.filter(d => d.type === "Exame Laboratorial");

  return (
    <DashboardLayout userName={profile?.name}>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#E8E4D9" }}>Compartilhar Exames</h1>
            <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
              Gere um QR temporário para o médico acessar exames selecionados.
            </p>
          </div>
          {labDocs.length > 0 && <ShareExamModal documents={labDocs} baseUrl={baseUrl} />}
        </div>

        {labDocs.length === 0 && (
          <div className="rounded-3xl p-8 text-center space-y-2" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <QrCode size={28} style={{ color: "#5A5A50", margin: "0 auto" }} />
            <p className="text-sm" style={{ color: "#9A9688" }}>Nenhum laudo disponível para compartilhar.</p>
            <a href="/documents" className="inline-block text-sm font-medium mt-2" style={{ color: "#52B788" }}>Enviar laudo →</a>
          </div>
        )}

        {tokens.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#9A9688" }}>
              Links ativos
            </h2>
            <ShareRevokeClient tokens={tokens} baseUrl={baseUrl} />
          </div>
        )}

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
