"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function seedUserData(userId: string) {
  const supabase = await createClient();

  // Biomarcadores iniciais
  await supabase.from("biomarkers").upsert([
    { user_id: userId, slug: "ldl", name: "LDL Colesterol", value: "118", unit: "mg/dL", reference: { min: 0, optimal: 100, borderline: 129, high: 160 }, status: "attention", trend: "stable", category: "Lipídios", last_date: "2025-04-10" },
    { user_id: userId, slug: "hdl", name: "HDL Colesterol", value: "62", unit: "mg/dL", reference: { optimal: 60, low: 40 }, status: "optimal", trend: "up", category: "Lipídios", last_date: "2025-04-10" },
    { user_id: userId, slug: "triglycerides", name: "Triglicerídeos", value: "142", unit: "mg/dL", reference: { optimal: 150, borderline: 199, high: 499 }, status: "optimal", trend: "down", category: "Lipídios", last_date: "2025-04-10" },
    { user_id: userId, slug: "hba1c", name: "Hemoglobina Glicada", value: "5.4", unit: "%", reference: { optimal: 5.6, prediabetes: 6.4, diabetes: 6.5 }, status: "optimal", trend: "stable", category: "Glicemia", last_date: "2025-04-10" },
    { user_id: userId, slug: "glucose", name: "Glicemia em Jejum", value: "94", unit: "mg/dL", reference: { optimal: 99, prediabetes: 125, diabetes: 126 }, status: "optimal", trend: "stable", category: "Glicemia", last_date: "2025-04-10" },
    { user_id: userId, slug: "bp", name: "Pressão Arterial", value: "118/76", unit: "mmHg", reference: { optimal: "120/80" }, status: "optimal", trend: "stable", category: "Cardiovascular", last_date: "2025-05-02" },
    { user_id: userId, slug: "weight", name: "Peso Corporal", value: "62.4", unit: "kg", reference: { bmi_target: "18.5–24.9" }, status: "optimal", trend: "down", category: "Composição", last_date: "2025-05-08" },
  ], { onConflict: "user_id,slug" });

  // Histórico de biomarcadores
  const historyRows = [
    ...["Out 24","Nov 24","Dez 24","Jan 25","Fev 25","Mar 25","Abr 25"].map((label, i) => ({ user_id: userId, biomarker_slug: "ldl", date_label: label, value: [134,128,122,119,121,115,118][i], recorded_at: `2024-${(10+i).toString().padStart(2,"0")}-01` })),
    ...["Out 24","Nov 24","Dez 24","Jan 25","Fev 25","Mar 25","Abr 25"].map((label, i) => ({ user_id: userId, biomarker_slug: "hdl", date_label: label, value: [55,57,58,59,61,60,62][i], recorded_at: `2024-${(10+i).toString().padStart(2,"0")}-01` })),
    ...["Out 24","Nov 24","Dez 24","Jan 25","Fev 25","Mar 25","Abr 25"].map((label, i) => ({ user_id: userId, biomarker_slug: "glucose", date_label: label, value: [98,96,99,97,95,93,94][i], recorded_at: `2024-${(10+i).toString().padStart(2,"0")}-01` })),
    ...["Out 24","Nov 24","Dez 24","Jan 25","Fev 25","Mar 25","Abr 25"].map((label, i) => ({ user_id: userId, biomarker_slug: "weight", date_label: label, value: [65.2,64.8,65.0,64.1,63.5,63.0,62.4][i], recorded_at: `2024-${(10+i).toString().padStart(2,"0")}-01` })),
  ];
  await supabase.from("biomarker_history").insert(historyRows);

  // Documentos
  await supabase.from("documents").insert([
    { user_id: userId, title: "Hemograma Completo", type: "Exame Laboratorial", date: "2025-04-10", lab: "Fleury", status: "reviewed", tags: ["sangue","rotina"] },
    { user_id: userId, title: "Lipidograma", type: "Exame Laboratorial", date: "2025-04-10", lab: "Fleury", status: "reviewed", tags: ["colesterol","lipídios"] },
    { user_id: userId, title: "Consulta Cardiologista", type: "Laudo Médico", date: "2025-03-22", lab: "Clínica CardioVita", status: "reviewed", tags: ["cardiologia","preventivo"] },
    { user_id: userId, title: "Ultrassom Abdominal", type: "Exame de Imagem", date: "2025-02-15", lab: "DASA", status: "pending", tags: ["imagem","abdome"] },
    { user_id: userId, title: "TSH e T4 Livre", type: "Exame Laboratorial", date: "2025-01-08", lab: "Hermes Pardini", status: "reviewed", tags: ["tireoide","hormônios"] },
  ]);

  // Medicamentos
  await supabase.from("medications").insert([
    { user_id: userId, name: "Vitamina D3", dose: "2000 UI", frequency: "1x ao dia", since: "2024-09-01", prescribed: true },
    { user_id: userId, name: "Ômega-3", dose: "1g", frequency: "2x ao dia", since: "2024-09-01", prescribed: true },
    { user_id: userId, name: "Magnésio Quelato", dose: "300mg", frequency: "1x ao dia (noite)", since: "2025-01-15", prescribed: true },
  ]);

  // Histórico familiar
  await supabase.from("family_history").insert([
    { user_id: userId, condition: "Diabetes Tipo 2", relation: "Pai", onset: "50 anos" },
    { user_id: userId, condition: "Hipertensão", relation: "Avó materna", onset: "60 anos" },
    { user_id: userId, condition: "Dislipidemia", relation: "Mãe", onset: "45 anos" },
    { user_id: userId, condition: "Doença cardíaca coronária", relation: "Avô paterno", onset: "68 anos" },
  ]);

  // Linha do tempo
  await supabase.from("timeline_events").insert([
    { user_id: userId, date: "2025-05-02", type: "checkup", title: "Verificação de PA", description: "Pressão arterial 118/76 mmHg — dentro da faixa ideal.", icon: "heart" },
    { user_id: userId, date: "2025-04-10", type: "exam", title: "Painel laboratorial completo", description: "Hemograma, lipidograma, glicemia, HbA1c, vitaminas e hormônios.", icon: "flask" },
    { user_id: userId, date: "2025-03-22", type: "consult", title: "Consulta — Cardiologista", description: "Avaliação preventiva. Médico orientou manter hábitos atuais.", icon: "stethoscope" },
    { user_id: userId, date: "2025-02-15", type: "exam", title: "Ultrassom Abdominal", description: "Solicitado pelo clínico geral. Resultado aguardando revisão.", icon: "scan" },
    { user_id: userId, date: "2025-01-08", type: "exam", title: "Painel Tireoidiano", description: "TSH 2.1 mUI/L, T4 livre 1.2 ng/dL — dentro dos parâmetros.", icon: "flask" },
    { user_id: userId, date: "2024-11-20", type: "vaccine", title: "Vacina Influenza", description: "Dose anual aplicada.", icon: "syringe" },
    { user_id: userId, date: "2024-09-05", type: "consult", title: "Consulta — Nutrologia", description: "Início de suplementação: Vitamina D3, Ômega-3, Magnésio.", icon: "pill" },
  ]);

  // Lembretes preventivos
  await supabase.from("preventive_reminders").insert([
    { user_id: userId, title: "Painel laboratorial", description: "Próximo exame de rotina recomendado em outubro/2025.", due_date: "2025-10-01", priority: "medium", icon: "flask" },
    { user_id: userId, title: "Consulta ginecológica", description: "Última visita há 11 meses. Considere agendar revisão anual.", due_date: "2025-06-01", priority: "high", icon: "calendar" },
    { user_id: userId, title: "Papanicolau", description: "Exame preventivo anual. Agende junto com consulta ginecológica.", due_date: "2025-06-01", priority: "high", icon: "clipboard" },
    { user_id: userId, title: "Densitometria óssea", description: "Histórico familiar recomenda avaliação periódica.", due_date: "2025-12-01", priority: "low", icon: "activity" },
  ]);

  // Health score
  await supabase.from("health_scores").upsert([
    { user_id: userId, overall: 78, metabolic: 82, cardiovascular: 85, lifestyle: 70, preventive: 65 },
  ], { onConflict: "user_id" });
}
