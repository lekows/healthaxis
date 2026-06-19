"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, AlertTriangle, FolderOpen, FileText,
  Image as ImageIcon, CheckCircle, Clock, Plus
} from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { BiomarkerTrendCard, HealthMetricCard } from "@/components/dashboard/MetricCards";
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
  id: string; title: string; type: string; lab: string;
  date: string; status: string; tags: string[] | null;
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

export function ExamsTabsClient({ biomarkers, historyBySlug, categories, documents, userName }: Props) {
  const [tab, setTab] = useState<Tab>("resultados");
  const [uploadOpen, setUploadOpen] = useState(false);

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
                      <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-2xl"
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
                          <DeleteDocumentButton documentId={doc.id} documentTitle={doc.title} />
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

      {uploadOpen && (
        <DocumentUploadModalInner onClose={() => setUploadOpen(false)} userName={userName ?? undefined} />
      )}
    </div>
  );
}
