"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, AlertTriangle, FolderOpen, FileText,
  Image as ImageIcon, CheckCircle, Clock, Plus, X,
  ExternalLink, Eye
} from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { BiomarkerTrendCard, HealthMetricCard, BiomarkerDetailModal } from "@/components/dashboard/MetricCards";
import { ManualBiomarkerModal } from "@/components/exams/ManualBiomarkerModal";
import { RecalculateStatusButton } from "@/components/exams/RecalculateStatusButton";
import { DocumentUploadModalInner } from "@/components/documents/DocumentUploadModal";
import { DeleteDocumentButton } from "@/components/documents/DeleteDocumentButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { ease } from "@/lib/motion";

type Tab = "resultados" | "arquivos";

type Biomarker = {
  id: string; slug: string; name: string; value: string; unit: string;
  status: string; trend: string; category: string; last_date: string | null;
  reference: Record<string, number> | null;
};

type DocItem = {
  id: string; title: string; type: string; lab: string | null;
  date: string; status: string; tags: string[] | null;
  file_url?: string | null;
};

interface Props {
  biomarkers: Biomarker[];
  historyBySlug: Record<string, { date: string; value: number }[]>;
  categories: string[];
  documents: DocItem[];
  userName?: string | null;
}

const statusLabel: Record<string, string> = { attention: "Atenção", high: "Elevado", low: "Baixo", critical: "Crítico" };
const statusVariant: Record<string, "warning" | "danger"> = { attention: "warning", high: "danger", low: "warning", critical: "danger" };
const typeIcon: Record<string, React.ElementType> = {
  "Exame Laboratorial": FlaskConical,
  "Laudo Médico": FileText,
  "Exame de Imagem": ImageIcon
};

const TABS: { id: Tab; label: string }[] = [
  { id: "resultados", label: "Resultados" },
  { id: "arquivos", label: "Arquivos" },
];

function getDocumentKind(doc: DocItem): "pdf" | "image" | "other" {
  const url = (doc.file_url ?? "").split("?")[0].toLowerCase();
  if (url.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|webp|gif|heic|heif)$/.test(url)) return "image";
  if (doc.type === "Exame de Imagem") return "image";
  return "other";
}

function formatDocumentDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function DocumentPreviewModal({ document, onClose }: { document: DocItem; onClose: () => void }) {
  const Icon = typeIcon[document.type] ?? FileText;
  const fileUrl = document.file_url ?? null;
  const kind = getDocumentKind(document);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed inset-x-3 bottom-3 top-10 lg:inset-8 z-50 overflow-hidden rounded-3xl flex flex-col"
        style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.08)" }}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        <div className="flex items-start justify-between gap-3 p-4 lg:p-5 border-b border-border-soft">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-forest-pale flex items-center justify-center shrink-0">
              <Icon size={16} className="text-forest" />
            </div>
            <div className="min-w-0">
              <p className="text-sm lg:text-base font-semibold text-ink leading-tight truncate">{document.title}</p>
              <p className="text-xs text-ink-faint mt-1">
                {document.type} · {document.lab || "Laboratório não informado"} · {formatDocumentDate(document.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: "#52B788", background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.25)" }}
              >
                <ExternalLink size={14} /> Abrir fora
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-2xl transition-opacity hover:opacity-70"
              style={{ color: "#9A9688", background: "rgba(255,255,255,0.05)" }}
              aria-label="Fechar visualização do arquivo"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-canvas-subtle">
          {!fileUrl ? (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <div>
                <FileText size={36} className="mx-auto mb-3 text-ink-faint" />
                <p className="text-sm font-semibold text-ink">Arquivo indisponível</p>
                <p className="text-xs text-ink-faint mt-1 max-w-sm">
                  Este registro existe na base, mas não possui URL de arquivo salva para pré-visualização.
                </p>
              </div>
            </div>
          ) : kind === "pdf" ? (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              title={`Visualização de ${document.title}`}
              className="w-full h-full border-0 bg-white"
            />
          ) : kind === "image" ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={fileUrl}
                alt={document.title}
                className="max-w-full max-h-full object-contain rounded-2xl"
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <div>
                <FileText size={36} className="mx-auto mb-3 text-ink-faint" />
                <p className="text-sm font-semibold text-ink">Pré-visualização não disponível</p>
                <p className="text-xs text-ink-faint mt-1 max-w-sm">
                  Este formato pode não abrir dentro do navegador. Use o botão abaixo para abrir o arquivo em uma nova aba.
                </p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold mt-4"
                  style={{ background: "#52B788", color: "#0D0D0B" }}
                >
                  <ExternalLink size={14} /> Abrir arquivo
                </a>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

export function ExamsTabsClient({ biomarkers, historyBySlug, categories, documents, userName }: Props) {
  const [tab, setTab] = useState<Tab>("resultados");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailBiomarker, setDetailBiomarker] = useState<Biomarker | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocItem | null>(null);

  const anomalies = biomarkers.filter(b => ["attention", "high", "low", "critical"].includes(b.status));
  const reviewed = documents.filter(d => d.status === "reviewed").length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-28 lg:pb-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Exames</h1>
          <p className="text-sm mt-1 text-ink-muted">
            {tab === "resultados"
              ? "Biomarcadores e resultados extraídos dos seus laudos."
              : `${documents.length} arquivo${documents.length !== 1 ? "s" : ""} · ${reviewed} revisado${reviewed !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          {tab === "resultados" && <RecalculateStatusButton />}
          {tab === "resultados" && <ManualBiomarkerModal />}
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: "#52B788", color: "#0D0D0B" }}
          >
            <Plus size={14} /> Enviar exame
          </button>
        </div>
      </div>

      {/* Tab pills */}
      <div
        className="flex gap-1 p-1 rounded-2xl w-fit"
        style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="relative px-5 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ color: tab === id ? "#52B788" : "#9A9688" }}
          >
            {tab === id && (
              <motion.div
                layoutId="exam-tab-active"
                className="absolute inset-0 rounded-xl"
                style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.18)" }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: ease.out }}
          className="space-y-8"
        >
          {tab === "resultados" && (
            <>
              {anomalies.length > 0 && (
                <div className="rounded-3xl p-5" style={{ background: "rgba(244,162,97,0.06)", border: "1px solid rgba(244,162,97,0.2)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={15} style={{ color: "#F4A261" }} />
                    <p className="text-sm font-semibold" style={{ color: "#F4A261" }}>
                      {anomalies.length} marcador{anomalies.length > 1 ? "es" : ""} fora do parâmetro ideal
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {anomalies.map(b => (
                      <div key={b.id} onClick={() => setDetailBiomarker(b)}
                        className="flex items-center gap-2 px-3 py-2 rounded-2xl cursor-pointer transition-opacity hover:opacity-75"
                        style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <span className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{b.name}</span>
                        <span className="text-sm font-bold" style={{ color: b.status === "critical" || b.status === "high" ? "#C1440E" : "#F4A261" }}>
                          {b.value} {b.unit}
                        </span>
                        <Badge variant={statusVariant[b.status] ?? "warning"}>
                          {statusLabel[b.status] ?? b.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailBiomarker && (
                <BiomarkerDetailModal
                  name={detailBiomarker.name}
                  value={Number(detailBiomarker.value)}
                  unit={detailBiomarker.unit}
                  status={detailBiomarker.status}
                  history={historyBySlug[detailBiomarker.slug] ?? []}
                  reference={detailBiomarker.reference ?? undefined}
                  slug={detailBiomarker.slug}
                  onClose={() => setDetailBiomarker(null)}
                />
              )}

              {biomarkers.length === 0 ? (
                <EmptyState
                  icon={FlaskConical}
                  title="Nenhum resultado ainda"
                  description="Envie um laudo laboratorial para extrair e visualizar seus biomarcadores automaticamente."
                  action={{ label: "Enviar exame", onClick: () => setUploadOpen(true) }}
                />
              ) : (
                categories.map(cat => {
                  const items = biomarkers.filter(b => b.category === cat);
                  return (
                    <div key={cat}>
                      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FlaskConical size={14} className="text-forest" /> {cat}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {items.map(b => {
                          const hist = historyBySlug[b.slug];
                          if (hist?.length) {
                            return <BiomarkerTrendCard key={b.id} slug={b.slug} name={b.name} value={Number(b.value)} unit={b.unit} status={b.status} history={hist} reference={b.reference ?? undefined} />;
                          }
                          return (
                            <HealthMetricCard
                              key={b.id}
                              name={b.name}
                              value={b.value}
                              unit={b.unit}
                              status={b.status}
                              trend={b.trend}
                              category={b.category}
                              lastDate={b.last_date ?? new Date().toISOString()}
                              slug={b.slug}
                              reference={b.reference ?? undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === "arquivos" && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total", value: documents.length, icon: FolderOpen, color: "#E8E4D9" },
                  { label: "Revisados", value: reviewed, icon: CheckCircle, color: "#52B788" },
                  { label: "Pendentes", value: documents.length - reviewed, icon: Clock, color: "#F4A261" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="p-5 text-center">
                    <Icon size={18} style={{ color }} className="mx-auto mb-2" />
                    <p className="text-2xl font-bold text-ink">{value}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{label}</p>
                  </Card>
                ))}
              </div>

              {documents.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="Nenhum arquivo ainda"
                  description="Envie um laudo ou exame para começar."
                  action={{ label: "Enviar exame", onClick: () => setUploadOpen(true) }}
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map(doc => {
                    const Icon = typeIcon[doc.type] ?? FileText;
                    const hasPreview = Boolean(doc.file_url);
                    return (
                      <Card
                        key={doc.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setPreviewDocument(doc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setPreviewDocument(doc);
                        }}
                        className="p-5 cursor-pointer hover:shadow-card-hover transition-shadow"
                        title={hasPreview ? "Abrir visualização do arquivo" : "Abrir detalhes do arquivo"}
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-forest-pale flex items-center justify-center shrink-0">
                            <Icon size={16} className="text-forest" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink leading-tight">{doc.title}</p>
                            <p className="text-xs text-ink-faint mt-0.5">{doc.type}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasPreview && <Eye size={14} className="text-forest" />}
                            <Badge variant={doc.status === "reviewed" ? "success" : "warning"}>
                              {doc.status === "reviewed" ? "✓" : "..."}
                            </Badge>
                            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                              <DeleteDocumentButton documentId={doc.id} documentTitle={doc.title} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-ink-faint mb-3">
                          <p>📍 {doc.lab || "Laboratório não informado"}</p>
                          <p>📅 {formatDocumentDate(doc.date)}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex gap-1 flex-wrap">
                            {(doc.tags ?? []).map((t: string) => (
                              <span key={t} className="px-2 py-0.5 rounded-full bg-canvas-subtle text-ink-faint border border-border-soft text-xs">{t}</span>
                            ))}
                          </div>
                          <span className="text-xs font-medium text-forest shrink-0">
                            {hasPreview ? "Visualizar" : "Sem arquivo"}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <MedicalDisclaimer compact />

      {/* Mobile FAB — acima da barra inferior */}
      <div className="lg:hidden fixed bottom-20 right-4 z-20">
        <motion.button
          onClick={() => setUploadOpen(true)}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-sm font-semibold"
          style={{ background: "#52B788", color: "#0D0D0B", boxShadow: "0 4px 24px rgba(82,183,136,0.35)" }}
        >
          <Plus size={18} />
          <span>Enviar exame</span>
        </motion.button>
      </div>

      {/* Mobile: botão recalcular status — acima do FAB principal */}
      {tab === "resultados" && (
        <div className="lg:hidden fixed bottom-36 right-4 z-20">
          <RecalculateStatusButton compact />
        </div>
      )}

      <AnimatePresence>
        {previewDocument && (
          <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
        )}
      </AnimatePresence>

      {uploadOpen && (
        <DocumentUploadModalInner onClose={() => setUploadOpen(false)} userName={userName ?? undefined} />
      )}
    </div>
  );
}
