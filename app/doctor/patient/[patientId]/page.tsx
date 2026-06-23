import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  FileText,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getProfile } from "@/lib/supabase/queries";
import {
  getDoctorProfile,
  getLinkedPatientPanel,
  getPatientLatestMetabolicAnalysis,
  getWatchedBiomarkers,
} from "@/lib/supabase/doctor-queries";

function getAge(dob: string | null) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Sem data";
  return new Date(date).toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    critical: "Crítico",
    high: "Alto",
    low: "Baixo",
    attention: "Atenção",
    optimal: "Ótimo",
  };
  return labels[status] ?? status;
}

function statusStyle(status: string) {
  if (["critical", "high", "low"].includes(status)) {
    return { background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" };
  }
  if (status === "attention") {
    return { background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.22)", color: "#F4A261" };
  }
  return { background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" };
}

const statusOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  low: 1,
  attention: 2,
  optimal: 3,
};

export default async function DoctorPatientPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  const [profile, doctorProfile, panel, watchedBiomarkers, latestAnalysis] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getLinkedPatientPanel(patientId),
    getWatchedBiomarkers(patientId),
    getPatientLatestMetabolicAnalysis(patientId),
  ]);

  if (!doctorProfile) redirect("/doctor/setup");
  if (!panel?.patient) notFound();

  const patient = panel.patient;
  const age = getAge(patient.dob);
  const sortedBiomarkers = [...panel.biomarkers].sort(
    (a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
  );
  const alteredBiomarkers = sortedBiomarkers.filter((item) => item.status !== "optimal");
  const criticalBiomarkers = sortedBiomarkers.filter((item) => ["critical", "high", "low"].includes(item.status));
  const latestDocument = panel.documents[0] ?? null;

  return (
    <DashboardLayout userName={profile?.name} isDoctor>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <Link href="/doctor" className="inline-flex items-center gap-2 text-xs font-semibold mb-5 transition-opacity hover:opacity-80" style={{ color: "#52B788" }}>
            <ArrowLeft size={14} /> Voltar ao cockpit médico
          </Link>

          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
                <Stethoscope size={19} style={{ color: "#52B788" }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Patient 360</p>
                <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>{patient.name}</h1>
                <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
                  {age !== null ? `${age} anos` : "Idade não informada"}
                  {patient.sex ? ` · ${patient.sex}` : ""}
                  {patient.dob ? ` · nasc. ${formatDate(patient.dob)}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`/doctor/patient/${patient.id}/report`} className="px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 text-center" style={{ background: "#52B788", color: "#0D0D0B" }}>
                Gerar relatório pré-consulta
              </Link>
              <div className="px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#9A9688" }}>
                Vínculo ativo iniciado pelo paciente. Esta tela organiza dados compartilhados e não emite conduta autônoma.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <BarChart3 size={18} style={{ color: "#52B788" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{panel.biomarkers.length}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Biomarcadores disponíveis</p>
          </div>
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <AlertTriangle size={18} style={{ color: "#F4A261" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: criticalBiomarkers.length > 0 ? "#F4A261" : "#E8E4D9" }}>{alteredBiomarkers.length}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Fora da faixa/atenção</p>
          </div>
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <FileText size={18} style={{ color: "#52B788" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{panel.documents.length}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Documentos recentes</p>
          </div>
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <ShieldCheck size={18} style={{ color: "#52B788" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{watchedBiomarkers.length}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Marcadores monitorados</p>
          </div>
        </div>

        <section className="rounded-3xl p-5 lg:p-6" style={{ background: "rgba(244,162,97,0.06)", border: "1px solid rgba(244,162,97,0.18)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "#F4A261" }}>
            <ClipboardIcon /> Resumo executivo para revisão médica
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Prioridade</p>
              <p className="mt-1" style={{ color: "#E8E4D9" }}>{criticalBiomarkers.length > 0 ? "Revisar biomarcadores críticos" : alteredBiomarkers.length > 0 ? "Acompanhar alterações" : "Sem alerta laboratorial imediato"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Último documento</p>
              <p className="mt-1" style={{ color: "#E8E4D9" }}>{latestDocument ? `${latestDocument.title} · ${formatDate(latestDocument.date)}` : "Nenhum documento recente"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>IA revisável</p>
              <p className="mt-1" style={{ color: "#E8E4D9" }}>{latestAnalysis ? "Há análise metabólica para conferência" : "Nenhuma análise metabólica concluída"}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <section className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9A9688" }}>Biomarcadores</h2>
                <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>Ordenados por prioridade de revisão.</p>
              </div>
              <span className="text-xs" style={{ color: "#5A5A50" }}>{alteredBiomarkers.length} alterados</span>
            </div>

            {sortedBiomarkers.length === 0 ? (
              <div className="rounded-3xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                <Activity size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
                <p className="text-sm font-medium mt-3" style={{ color: "#E8E4D9" }}>Nenhum biomarcador disponível</p>
                <p className="text-xs mt-1" style={{ color: "#9A9688" }}>O paciente ainda não possui exame processado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedBiomarkers.map((biomarker) => (
                  <div key={biomarker.id} className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{biomarker.name}</p>
                        <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={statusStyle(biomarker.status)}>
                          {statusLabel(biomarker.status)}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>{biomarker.category} · último dado {formatDate(biomarker.last_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: "#E8E4D9" }}>{biomarker.value} {biomarker.unit}</p>
                      <p className="text-xs mt-1" style={{ color: "#9A9688" }}>tendência: {biomarker.trend ?? "-"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "#9A9688" }}>
                <FileText size={14} style={{ color: "#52B788" }} /> Documentos
              </h2>
              <div className="mt-4 space-y-3">
                {panel.documents.length === 0 ? (
                  <p className="text-xs" style={{ color: "#9A9688" }}>Nenhum documento recente.</p>
                ) : panel.documents.map((document) => (
                  <div key={document.id} className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{document.title}</p>
                    <p className="text-xs mt-1" style={{ color: "#9A9688" }}>{formatDate(document.date)} · {document.lab ?? "laboratório não informado"}</p>
                    <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>{document.status}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl p-5" style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.18)" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "#52B788" }}>
                <CalendarClock size={14} /> Próxima ação
              </h2>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: "#9A9688" }}>
                Use o relatório pré-consulta para revisar exames, evolução e pontos de atenção antes do atendimento. O médico decide, edita ou rejeita qualquer interpretação.
              </p>
            </section>
          </aside>
        </div>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}

function ClipboardIcon() {
  return <FileText size={14} />;
}
