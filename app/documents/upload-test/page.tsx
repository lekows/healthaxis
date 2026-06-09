import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UploadDiagnosticClient } from "@/components/documents/UploadDiagnosticClient";
import { getProfile } from "@/lib/supabase/queries";

export default async function UploadTestPage() {
  const profile = await getProfile();

  return (
    <DashboardLayout userName={profile?.name}>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <Link href="/documents" className="inline-flex items-center gap-2 text-sm text-ink-muted">
          <ArrowLeft size={15} /> Voltar para documentos
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink">Diagnostico de upload</h1>
          <p className="text-sm text-ink-muted mt-2">
            Este teste nao cria documento nem processa exames. Ele verifica leitura no dispositivo,
            sessao, envio ao Storage, leitura pelo servidor e remocao do arquivo temporario.
          </p>
        </div>
        <div className="rounded-3xl p-5 border border-white/10" style={{ background: "#141412" }}>
          <UploadDiagnosticClient />
        </div>
      </div>
    </DashboardLayout>
  );
}
