import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge } from "@/components/ui";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { ClipboardList, CheckCircle2, Circle } from "lucide-react";

const sections = [
  {
    title: "Dados pessoais",
    complete: true,
    fields: [
      { label: "Nome completo", value: "Ana Beatriz Mendes", done: true },
      { label: "Data de nascimento", value: "12/07/1990", done: true },
      { label: "Sexo biológico", value: "Feminino", done: true },
      { label: "Tipo sanguíneo", value: "A+", done: true }
    ]
  },
  {
    title: "Hábitos de vida",
    complete: false,
    fields: [
      { label: "Atividade física", value: "2-3x por semana", done: true },
      { label: "Tabagismo", value: "Não fumante", done: true },
      { label: "Consumo de álcool", value: "Ocasional", done: true },
      { label: "Qualidade do sono", value: "Não informado", done: false }
    ]
  },
  {
    title: "Histórico clínico",
    complete: false,
    fields: [
      { label: "Cirurgias anteriores", value: "Nenhuma", done: true },
      { label: "Hospitalizações", value: "Nenhuma", done: true },
      { label: "Alergias", value: "Não informado", done: false },
      { label: "Doenças crônicas", value: "Não informado", done: false }
    ]
  },
  {
    title: "Saúde feminina",
    complete: false,
    fields: [
      { label: "Última menstruação", value: "Não informado", done: false },
      { label: "Uso de contraceptivos", value: "Não informado", done: false },
      { label: "Gestações anteriores", value: "Nenhuma", done: true }
    ]
  }
];

export default function AnamnesisPage() {
  const totalFields = sections.flatMap(s => s.fields).length;
  const doneFields = sections.flatMap(s => s.fields).filter(f => f.done).length;
  const pct = Math.round((doneFields / totalFields) * 100);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-ink">Anamnese</h1>
          <p className="text-ink-muted text-sm mt-1">Questionário de saúde completo para contextualizar seu histórico.</p>
        </div>

        {/* Progress */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink">Completude do perfil</p>
            <Badge variant={pct >= 80 ? "success" : "warning"}>{pct}% completo</Badge>
          </div>
          <div className="h-3 bg-canvas-subtle rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct >= 80 ? "#52B788" : "#F4A261" }}
            />
          </div>
          <p className="text-xs text-ink-faint mt-2">{doneFields} de {totalFields} campos preenchidos</p>
        </Card>

        {/* Sections */}
        <div className="space-y-5">
          {sections.map(section => (
            <Card key={section.title} className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                  <ClipboardList size={16} className="text-forest" />
                  {section.title}
                </h2>
                <Badge variant={section.complete ? "success" : "warning"}>
                  {section.complete ? "Completo" : "Pendente"}
                </Badge>
              </div>

              <div className="space-y-3">
                {section.fields.map(field => (
                  <div key={field.label} className="flex items-center gap-3">
                    {field.done
                      ? <CheckCircle2 size={15} className="text-forest-light shrink-0" />
                      : <Circle size={15} className="text-ink-faint shrink-0" />
                    }
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-ink-muted">{field.label}</span>
                      <span className={`text-sm font-medium ${field.done ? "text-ink" : "text-ink-faint italic"}`}>
                        {field.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
