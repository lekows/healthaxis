import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Printer, ShieldCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getProfile } from "@/lib/supabase/queries";
import {
  getDoctorProfile,
  getLinkedPatientPanel,
  getPatientLatestMetabolicAnalysis,
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

const statusOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  low: 1,
  attention: 2,
  optimal: 3,
};

export default async function PreConsultationReportPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  const [profile, doctorProfile, panel, latestAnalysis] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getLinkedPatientPanel(patientId),
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

  const reviewQuestions = [
    criticalBiomarkers.length > 0 ? "Há biomarcadores críticos/altos/baixos que exigem revisão contextual?" : null,
    alteredBiomarkers.length > 0 ? "As alterações laboratoriais são persistentes ou pontuais?" : null,
    latestDocument ? "O exame mais recente modifica o plano de acompanhamento?" : "O paciente precisa enviar exames recentes?",
    latestAnalysis ? "A análise metabólica automatizada faz sentido clinicamente ou deve ser editada/rejeitada?" : null,
    "Há sintomas, adesão, efeitos adversos ou barreiras comportamentais a revisar na consulta?",
  ].filter(Boolean) as string[];

  return (
    <DashboardLayout userName={profile?.name} isDoctor>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <Link href={`/doctor/patient/${patient.id}`} className="inline-flex items-center gap-2 text-xs font-semibold mb-5 transition-opacity hover:opacity-80" style={{ color: "#52B788" }}>
              <ArrowLeft size={14} /> Voltar ao Patient 360
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
                <FileText size={19} style={{ color: "#52B788" }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Relatório pré-consulta</p>
                <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>{patient.name}</h1>
                <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
                  {age !== null ? `${age} anos` : "Idade não informada"}
                  {patient.sex ? ` · ${patient.sex}` : ""}
                  {patient.dob ? ` · nasc. ${formatDate(patient.dob)}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9A9688" }}>
            <Printer size={15} /> Imprimir pelo navegador
          </div>
        </div>

        <section className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} style={{ color: "#52B788" }} />
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Uso clínico com médico no comando</h2>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>
                Este relatório organiza dados compartilhados pelo paciente. Ele não fecha diagnóstico, não prescreve e não substitui julgamento médico. Achados, hipóteses e condutas devem ser revisados, editados ou recusados pelo médico.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl p-5 lg:p-6" style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.18)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#52B788" }}>Resumo executivo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Prioridade laboratorial</p>
              <p className="mt-1" style={{ color: "#E8E4D9" }}>
                {criticalBiomarkers.length > 0
                  ? `${criticalBiomarkers.length} biomarcador(es) em faixa crítica/alta/baixa.`
                  : alteredBiomarkers.length > 0
                    ? `${alteredBiomarkers.length} biomarcador(es) para acompanhamento.`
                    : "Sem biomarcador alterado no painel atual."}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Último documento</p>
              <p className="mt-1" style={{ color: "#E8E4D9" }}>{latestDocument ? `${latestDocument.title} · ${formatDate(latestDocument.date)}` : "Nenhum documento recente."}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Biomarcadores totais</p>
              <p className="mt-1" style={{ color: "#E8E4D9" }}>{panel.biomarkers.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Análise IA</p>
              <p className="mt-1" style={{ color: "#E8E4D9" }}>{latestAnalysis ? "Análise metabólica disponível para revisão." : "Nenhuma análise metabólica concluída."}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9A9688" }}>Pontos de atenção para consulta</h2>
          <div className="mt-4 space-y-3">
            {reviewQuestions.map((question) => (
              <div key={question} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-sm" style={{ color: "#E8E4D9" }}>{question}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9A9688" }}>Biomarcadores priorizados</h2>
          {sortedBiomarkers.length === 0 ? (
            <p className="text-sm mt-4" style={{ color: "#9A9688" }}>Nenhum biomarcador disponível.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "#5A5A50" }}>
                    <th className="text-left py-3 font-medium">Marcador</th>
                    <th className="text-left py-3 font-medium">Valor</th>
                    <th className="text-left py-3 font-medium">Status</th>
                    <th className="text-left py-3 font-medium">Última data</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBiomarkers.map((biomarker) => (
                    <tr key={biomarker.id} style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <td className="py-3 pr-4" style={{ color: "#E8E4D9" }}>{biomarker.name}</td>
                      <td className="py-3 pr-4" style={{ color: "#9A9688" }}>{biomarker.value} {biomarker.unit}</td>
                      <td className="py-3 pr-4" style={{ color: biomarker.status === "optimal" ? "#52B788" : "#F4A261" }}>{statusLabel(biomarker.status)}</td>
                      <td className="py-3 pr-4" style={{ color: "#9A9688" }}>{formatDate(biomarker.last_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9A9688" }}>Documentos considerados</h2>
          {panel.documents.length === 0 ? (
            <p className="text-sm mt-4" style={{ color: "#9A9688" }}>Nenhum documento recente.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {panel.documents.map((document) => (
                <div key={document.id} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{document.title}</p>
                  <p className="text-xs mt-1" style={{ color: "#9A9688" }}>{formatDate(document.date)} · {document.lab ?? "laboratório não informado"} · {document.status}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl p-5 lg:p-6" style={{ background: "rgba(244,162,97,0.06)", border: "1px solid rgba(244,162,97,0.18)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#F4A261" }}>Checklist de revisão humana</h2>
          <div className="mt-4 space-y-2 text-sm" style={{ color: "#E8E4D9" }}>
            <p>☐ Conferir se os dados extraídos batem com o laudo original.</p>
            <p>☐ Confirmar contexto clínico, sintomas, medicações e adesão.</p>
            <p>☐ Aceitar, editar ou rejeitar qualquer interpretação automatizada.</p>
            <p>☐ Registrar plano decidido pelo médico fora deste relatório, quando aplicável.</p>
          </div>
        </section>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
