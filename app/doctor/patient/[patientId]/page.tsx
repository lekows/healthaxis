import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, FlaskConical, ShieldCheck, Stethoscope, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getLinkedPatientPanel, getWatchedBiomarkers } from "@/lib/supabase/doctor-queries";

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    optimal: "Dentro da faixa",
    attention: "Atenção",
    high: "Elevado",
    low: "Baixo",
    critical: "Crítico",
  };
  return labels[status] ?? status;
}

function getStatusStyle(status: string) {
  if (status === "optimal") return { background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" };
  if (status === "critical") return { background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" };
  return { background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.22)", color: "#F4A261" };
}

function getAge(dob: string | null) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export default async function DoctorPatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;

  const [profile, doctorProfile, panel, watchedBiomarkers] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getLinkedPatientPanel(patientId),
    getWatchedBiomarkers(patientId),
  ]);

  if (!doctorProfile) redirect("/doctor/setup");
  if (!panel?.patient) notFound();

  const patientAge = getAge(panel.patient.dob);
  const alteredBiomarkers = panel.biomarkers.filter((biomarker) => biomarker.status !== "optimal");
  const latestDocument = panel.documents[0] ?? null;
  const watchedSlugs = new Set(watchedBiomarkers.map((biomarker) => biomarker.slug));

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <Link href="/doctor" className="inline-flex items-center gap-2 text-xs font-semibold mb-5 transition-opacity hover:opacity-80" style={{ color: "#52B788" }}>
              <ArrowLeft size={14} /> Voltar ao cockpit
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
                <Stethoscope size={19} style={{ color: "#52B788" }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Patient 360</p>
                <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>{panel.patient.name}</h1>
                <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
                  {patientAge ? `${patientAge} anos` : "Idade não informada"}{panel.patient.sex ? ` · ${panel.patient.sex}` : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 rounded-2xl max-w-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "#9A9688" }}>
              Dados exibidos apenas porque existe vínculo ativo iniciado pelo paciente. Esta tela organiza informação clínica para revisão médica, sem decisão automática.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <FlaskConical size={18} style={{ color: "#52B788" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{panel.biomarkers.length}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Biomarcadores disponíveis</p>
          </div>
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <TrendingUp size={18} style={{ color: "#F4A261" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{alteredBiomarkers.length}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Pontos fora da faixa</p>
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

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9A9688" }}>Biomarcadores</h2>
                <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>Ordenar e interpretar clinicamente fica sob responsabilidade do médico.</p>
              </div>
              {latestDocument && (
                <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9A9688" }}>
                  Último exame: {new Date(latestDocument.date).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>

            {panel.biomarkers.length === 0 ? (
              <div className="rounded-3xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                <FlaskConical size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
                <p className="text-sm font-medium mt-3" style={{ color: "#E8E4D9" }}>Nenhum biomarcador compartilhado ainda</p>
                <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: "#9A9688" }}>O cockpit só exibe dados que o paciente enviou e compartilhou.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {panel.biomarkers.map((biomarker) => (
                  <div key={biomarker.id} className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{biomarker.name}</p>
                        {watchedSlugs.has(biomarker.slug) && (
                          <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>monitorado</span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>{biomarker.category}</p>
                    </div>
                    <div className="flex items-center gap-3 lg:w-[340px] lg:justify-end">
                      <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{biomarker.value} {biomarker.unit}</p>
                      <span className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold" style={getStatusStyle(biomarker.status)}>
                        {getStatusLabel(biomarker.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "#9A9688" }}>
                <CalendarDays size={14} style={{ color: "#52B788" }} /> Documentos
              </h2>
              <div className="space-y-3 mt-4">
                {panel.documents.length === 0 ? (
                  <p className="text-xs" style={{ color: "#5A5A50" }}>Nenhum documento compartilhado.</p>
                ) : panel.documents.map((document) => (
                  <div key={document.id} className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{document.title}</p>
                    <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>
                      {document.lab ?? "Laboratório não informado"} · {new Date(document.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl p-5" style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.18)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Relatório pré-consulta</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>
                Próxima etapa: gerar um resumo longitudinal com evolução, exames alterados, hábitos, sintomas e decisões médicas registradas.
              </p>
            </div>
          </div>
        </div>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
