import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge } from "@/components/ui";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getDocuments, getProfile } from "@/lib/supabase/queries";
import { FolderOpen, FileText, FlaskConical, Image as ImageIcon, CheckCircle, Clock } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { UploadDocumentButton } from "@/components/documents/DocumentUploadModal";

const typeIcon: Record<string, React.ElementType> = {
  "Exame Laboratorial": FlaskConical,
  "Laudo Médico": FileText,
  "Exame de Imagem": ImageIcon
};

export default async function DocumentsPage() {
  const [profile, documents] = await Promise.all([getProfile(), getDocuments()]);

  const reviewed = documents.filter(d => d.status === "reviewed").length;

  return (
    <DashboardLayout userName={profile?.name}>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Documentos</h1>
            <p className="text-ink-muted text-sm mt-1">{documents.length} arquivos · {reviewed} revisados</p>
          </div>
          <UploadDocumentButton userName={profile?.name} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: documents.length, icon: FolderOpen, color: "text-ink" },
            { label: "Revisados", value: reviewed, icon: CheckCircle, color: "text-forest" },
            { label: "Pendentes", value: documents.length - reviewed, icon: Clock, color: "text-terra" }
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-5 text-center">
              <Icon size={18} className={`${color} mx-auto mb-2`} />
              <p className="text-2xl font-bold text-ink">{value}</p>
              <p className="text-xs text-ink-faint mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {documents.length === 0 && (
          <EmptyState
            icon={FolderOpen}
            title="Nenhum documento ainda"
            description='Clique em "Adicionar documento" acima para fazer upload de laudos, exames ou imagens médicas.'
          />
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => {
            const Icon = typeIcon[doc.type] ?? FileText;
            return (
              <Card key={doc.id} className="p-5 cursor-pointer hover:shadow-card-hover transition-shadow">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-forest-pale flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-forest" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink leading-tight">{doc.title}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{doc.type}</p>
                  </div>
                  <Badge variant={doc.status === "reviewed" ? "success" : "warning"}>
                    {doc.status === "reviewed" ? "✓" : "..."}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-ink-faint mb-3">
                  <p>📍 {doc.lab}</p>
                  <p>📅 {new Date(doc.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(doc.tags ?? []).map((t: string) => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-canvas-subtle text-ink-faint border border-border-soft text-xs">{t}</span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
