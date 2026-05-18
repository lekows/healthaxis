// HealthAxis — Mock Data

export const userProfile = {
  name: "Ana Beatriz Mendes",
  age: 34,
  dob: "1990-07-12",
  blood: "A+",
  height: 165,
  weight: 62.4,
  bmi: 22.9,
  lastSync: "2025-05-08",
  avatar: null
};

export const biomarkers = [
  {
    id: "ldl",
    name: "LDL Colesterol",
    value: 118,
    unit: "mg/dL",
    reference: { min: 0, optimal: 100, borderline: 129, high: 160 },
    status: "attention",
    trend: "stable",
    category: "Lipídios",
    lastDate: "2025-04-10"
  },
  {
    id: "hdl",
    name: "HDL Colesterol",
    value: 62,
    unit: "mg/dL",
    reference: { optimal: 60, low: 40 },
    status: "optimal",
    trend: "up",
    category: "Lipídios",
    lastDate: "2025-04-10"
  },
  {
    id: "triglycerides",
    name: "Triglicerídeos",
    value: 142,
    unit: "mg/dL",
    reference: { optimal: 150, borderline: 199, high: 499 },
    status: "optimal",
    trend: "down",
    category: "Lipídios",
    lastDate: "2025-04-10"
  },
  {
    id: "hba1c",
    name: "Hemoglobina Glicada",
    value: 5.4,
    unit: "%",
    reference: { optimal: 5.6, prediabetes: 6.4, diabetes: 6.5 },
    status: "optimal",
    trend: "stable",
    category: "Glicemia",
    lastDate: "2025-04-10"
  },
  {
    id: "glucose",
    name: "Glicemia em Jejum",
    value: 94,
    unit: "mg/dL",
    reference: { optimal: 99, prediabetes: 125, diabetes: 126 },
    status: "optimal",
    trend: "stable",
    category: "Glicemia",
    lastDate: "2025-04-10"
  },
  {
    id: "bp",
    name: "Pressão Arterial",
    value: "118/76",
    unit: "mmHg",
    reference: { optimal: "120/80" },
    status: "optimal",
    trend: "stable",
    category: "Cardiovascular",
    lastDate: "2025-05-02"
  },
  {
    id: "weight",
    name: "Peso Corporal",
    value: 62.4,
    unit: "kg",
    reference: { bmi_target: "18.5–24.9" },
    status: "optimal",
    trend: "down",
    category: "Composição",
    lastDate: "2025-05-08"
  }
];

export const biomarkerHistory = {
  ldl: [
    { date: "Out 24", value: 134 },
    { date: "Nov 24", value: 128 },
    { date: "Dez 24", value: 122 },
    { date: "Jan 25", value: 119 },
    { date: "Fev 25", value: 121 },
    { date: "Mar 25", value: 115 },
    { date: "Abr 25", value: 118 }
  ],
  hdl: [
    { date: "Out 24", value: 55 },
    { date: "Nov 24", value: 57 },
    { date: "Dez 24", value: 58 },
    { date: "Jan 25", value: 59 },
    { date: "Fev 25", value: 61 },
    { date: "Mar 25", value: 60 },
    { date: "Abr 25", value: 62 }
  ],
  glucose: [
    { date: "Out 24", value: 98 },
    { date: "Nov 24", value: 96 },
    { date: "Dez 24", value: 99 },
    { date: "Jan 25", value: 97 },
    { date: "Fev 25", value: 95 },
    { date: "Mar 25", value: 93 },
    { date: "Abr 25", value: 94 }
  ],
  weight: [
    { date: "Out 24", value: 65.2 },
    { date: "Nov 24", value: 64.8 },
    { date: "Dez 24", value: 65.0 },
    { date: "Jan 25", value: 64.1 },
    { date: "Fev 25", value: 63.5 },
    { date: "Mar 25", value: 63.0 },
    { date: "Abr 25", value: 62.4 }
  ]
};

export const documents = [
  {
    id: "doc-1",
    title: "Hemograma Completo",
    type: "Exame Laboratorial",
    date: "2025-04-10",
    lab: "Fleury",
    status: "reviewed",
    tags: ["sangue", "rotina"]
  },
  {
    id: "doc-2",
    title: "Lipidograma",
    type: "Exame Laboratorial",
    date: "2025-04-10",
    lab: "Fleury",
    status: "reviewed",
    tags: ["colesterol", "lipídios"]
  },
  {
    id: "doc-3",
    title: "Consulta Cardiologista",
    type: "Laudo Médico",
    date: "2025-03-22",
    lab: "Clínica CardioVita",
    status: "reviewed",
    tags: ["cardiologia", "preventivo"]
  },
  {
    id: "doc-4",
    title: "Ultrassom Abdominal",
    type: "Exame de Imagem",
    date: "2025-02-15",
    lab: "DASA",
    status: "pending",
    tags: ["imagem", "abdome"]
  },
  {
    id: "doc-5",
    title: "TSH e T4 Livre",
    type: "Exame Laboratorial",
    date: "2025-01-08",
    lab: "Hermes Pardini",
    status: "reviewed",
    tags: ["tireoide", "hormônios"]
  }
];

export const medications = [
  {
    id: "med-1",
    name: "Vitamina D3",
    dose: "2000 UI",
    frequency: "1x ao dia",
    since: "2024-09-01",
    prescribed: true
  },
  {
    id: "med-2",
    name: "Ômega-3",
    dose: "1g",
    frequency: "2x ao dia",
    since: "2024-09-01",
    prescribed: true
  },
  {
    id: "med-3",
    name: "Magnésio Quelato",
    dose: "300mg",
    frequency: "1x ao dia (noite)",
    since: "2025-01-15",
    prescribed: true
  }
];

export const familyHistory = [
  { condition: "Diabetes Tipo 2", relation: "Pai", onset: "50 anos" },
  { condition: "Hipertensão", relation: "Avó materna", onset: "60 anos" },
  { condition: "Dislipidemia", relation: "Mãe", onset: "45 anos" },
  { condition: "Doença cardíaca coronária", relation: "Avô paterno", onset: "68 anos" }
];

export const timelineEvents = [
  {
    id: "tl-1",
    date: "2025-05-02",
    type: "checkup",
    title: "Verificação de PA",
    description: "Pressão arterial 118/76 mmHg — dentro da faixa ideal.",
    icon: "heart"
  },
  {
    id: "tl-2",
    date: "2025-04-10",
    type: "exam",
    title: "Painel laboratorial completo",
    description: "Hemograma, lipidograma, glicemia, HbA1c, vitaminas e hormônios.",
    icon: "flask"
  },
  {
    id: "tl-3",
    date: "2025-03-22",
    type: "consult",
    title: "Consulta — Cardiologista",
    description: "Avaliação preventiva. Médico orientou manter hábitos atuais.",
    icon: "stethoscope"
  },
  {
    id: "tl-4",
    date: "2025-02-15",
    type: "exam",
    title: "Ultrassom Abdominal",
    description: "Solicitado pelo clínico geral. Resultado aguardando revisão.",
    icon: "scan"
  },
  {
    id: "tl-5",
    date: "2025-01-08",
    type: "exam",
    title: "Painel Tireoidiano",
    description: "TSH 2.1 mUI/L, T4 livre 1.2 ng/dL — dentro dos parâmetros.",
    icon: "flask"
  },
  {
    id: "tl-6",
    date: "2024-11-20",
    type: "vaccine",
    title: "Vacina Influenza",
    description: "Dose anual aplicada.",
    icon: "syringe"
  },
  {
    id: "tl-7",
    date: "2024-09-05",
    type: "consult",
    title: "Consulta — Nutrologia",
    description: "Início de suplementação: Vitamina D3, Ômega-3, Magnésio.",
    icon: "pill"
  }
];

export const preventiveReminders = [
  {
    id: "rem-1",
    title: "Painel laboratorial",
    description: "Próximo exame de rotina recomendado em outubro/2025.",
    dueDate: "2025-10-01",
    priority: "medium",
    icon: "flask",
    daysUntil: 146
  },
  {
    id: "rem-2",
    title: "Consulta ginecológica",
    description: "Última visita há 11 meses. Considere agendar revisão anual.",
    dueDate: "2025-06-01",
    priority: "high",
    icon: "calendar",
    daysUntil: 24
  },
  {
    id: "rem-3",
    title: "Papanicolau",
    description: "Exame preventivo anual. Agende junto com consulta ginecológica.",
    dueDate: "2025-06-01",
    priority: "high",
    icon: "clipboard",
    daysUntil: 24
  },
  {
    id: "rem-4",
    title: "Densitometria óssea",
    description: "Histórico familiar recomenda avaliação periódica.",
    dueDate: "2025-12-01",
    priority: "low",
    icon: "activity",
    daysUntil: 207
  }
];

export const healthScore = {
  overall: 78,
  categories: {
    metabolic: 82,
    cardiovascular: 85,
    lifestyle: 70,
    preventive: 65
  }
};
