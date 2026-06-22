export interface BiomarkerRange {
  min?: number;
  max?: number;
}

interface SexRanges {
  male?: BiomarkerRange;
  female?: BiomarkerRange;
  universal?: BiomarkerRange;
  descricao?: string;
}

const REFERENCES: Record<string, SexRanges> = {
  // ── Hemograma ──────────────────────────────────────────────────────────
  hemoglobina:        { male: { min: 13.5, max: 17.5 }, female: { min: 12.0, max: 16.0 }, descricao: "Proteína que carrega oxigênio nos glóbulos vermelhos. Valores baixos causam cansaço e indicam anemia." },
  hematocrito:        { male: { min: 41,   max: 53   }, female: { min: 36,   max: 46   }, descricao: "Percentual do sangue ocupado por glóbulos vermelhos. Reflete a capacidade de transporte de oxigênio." },
  hemacias:           { male: { min: 4.5,  max: 6.0  }, female: { min: 4.0,  max: 5.4  }, descricao: "Contagem de glóbulos vermelhos. Baixa indica anemia; alta pode ocorrer em desidratação ou doenças pulmonares." },
  eritrocitos:        { male: { min: 4.5,  max: 6.0  }, female: { min: 4.0,  max: 5.4  }, descricao: "Contagem de glóbulos vermelhos. Baixa indica anemia; alta pode ocorrer em desidratação ou doenças pulmonares." },
  vcm:                { universal: { min: 80,  max: 100  }, descricao: "Tamanho médio dos glóbulos vermelhos. Ajuda a identificar o tipo de anemia." },
  hcm:                { universal: { min: 27,  max: 33   }, descricao: "Quantidade de hemoglobina em cada glóbulo vermelho. Útil para classificar anemias." },
  chcm:               { universal: { min: 32,  max: 36   }, descricao: "Concentração de hemoglobina dentro dos glóbulos vermelhos. Indica eficiência na produção de hemoglobina." },
  rdw:                { universal: { min: 11.5, max: 14.5 }, descricao: "Variação de tamanho entre os glóbulos vermelhos. Valores altos podem indicar deficiência nutricional." },
  reticulocitos:      { universal: { min: 0.5, max: 2.5  }, descricao: "Glóbulos vermelhos imaturos. Elevados indicam que a medula está produzindo mais hemácias, como após hemorragia ou tratamento de anemia." },
  // Leucócitos: laboratórios brasileiros reportam contagem absoluta em /mm³ (ex: 5610)
  leucocitos:         { universal: { min: 3600, max: 11000 }, descricao: "Glóbulos brancos — as células de defesa do organismo. Elevados indicam infecção ou inflamação; baixos, imunidade reduzida." },
  // Neutrófilos/Linfócitos/Monócitos: reportados em % (os labs mostram % como valor primário)
  neutrofilos:              { universal: { min: 40, max: 70 }, descricao: "Principal tipo de glóbulo branco. Elevado indica infecção bacteriana ou inflamação; baixo, risco de infecção grave." },
  "neutrofilos-segmentados":{ universal: { min: 40, max: 70 }, descricao: "Principal tipo de glóbulo branco. Elevado indica infecção bacteriana ou inflamação; baixo, risco de infecção grave." },
  segmentados:              { universal: { min: 40, max: 70 }, descricao: "Principal tipo de glóbulo branco. Elevado indica infecção bacteriana ou inflamação; baixo, risco de infecção grave." },
  bastonetes:               { universal: { min: 0,  max: 5  }, descricao: "Neutrófilos imaturos. Presença elevada ('desvio à esquerda') indica infecção bacteriana aguda." },
  "neutrofilos-bastonetes":  { universal: { min: 0,  max: 5  }, descricao: "Neutrófilos imaturos. Presença elevada ('desvio à esquerda') indica infecção bacteriana aguda." },
  linfocitos:         { universal: { min: 20, max: 50 }, descricao: "Células de defesa que combatem vírus e produzem anticorpos. Elevados em infecções virais; baixos, em imunossupressão." },
  monocitos:          { universal: { min: 3,  max: 14 }, descricao: "Glóbulos brancos que fagocitam agentes infecciosos. Elevados em infecções crônicas ou inflamações." },
  eosinofilos:        { universal: { min: 1,  max: 7  }, descricao: "Glóbulos brancos ligados a alergias e parasitas. Elevados podem indicar alergia, asma ou infecção por parasita." },
  basofilos:          { universal: { min: 0,  max: 2  }, descricao: "Glóbulo branco menos frequente, envolvido em reações alérgicas. Raramente elevado em condições normais." },
  plaquetas:          { universal: { min: 150, max: 400  }, descricao: "Células que controlam a coagulação. Baixas aumentam risco de sangramento; altas, risco de trombose." },
  mpv:                { universal: { min: 7.5, max: 12.5 }, descricao: "Volume médio das plaquetas. Plaquetas maiores costumam ser mais ativas; útil na avaliação de trombocitopenia." },

  // ── Glicemia ───────────────────────────────────────────────────────────
  glicose:               { universal: { min: 70, max: 99    }, descricao: "Açúcar no sangue em jejum. Indicador precoce de pré-diabetes e resistência à insulina." },
  glicemia:              { universal: { min: 70, max: 99    }, descricao: "Açúcar no sangue em jejum. Indicador precoce de pré-diabetes e resistência à insulina." },
  "hemoglobina-glicada": { universal: { max: 5.7             }, descricao: "Média do açúcar nos últimos 3 meses. Essencial para diagnóstico e controle do diabetes." },
  insulina:              { universal: { min: 2.6, max: 24.9 }, descricao: "Hormônio que regula a entrada do açúcar nas células. Elevada em jejum indica resistência à insulina." },

  // ── Lipídios ───────────────────────────────────────────────────────────
  "colesterol-total": { universal: { max: 200 }, descricao: "Soma de todo o colesterol no sangue. Deve ser analisado junto com as frações LDL e HDL." },
  "ldl-colesterol":   { universal: { max: 130 }, descricao: "Colesterol 'ruim' — níveis altos entopem artérias e aumentam o risco de infarto e AVC." },
  "hdl-colesterol":   { male: { min: 40 }, female: { min: 50 }, descricao: "Colesterol 'bom' — protege o coração removendo gordura das artérias. Quanto maior, melhor." },
  triglicerides:      { universal: { max: 150 }, descricao: "Gordura no sangue. Valores altos aumentam risco cardíaco e indicam excesso de açúcar ou álcool na dieta." },
  triglicerideos:     { universal: { max: 150 }, descricao: "Gordura no sangue. Valores altos aumentam risco cardíaco e indicam excesso de açúcar ou álcool na dieta." },
  vldl:               { universal: { max: 30  }, descricao: "Lipoproteína que carrega triglicerídeos pelo sangue. Elevada aumenta o risco cardiovascular." },

  // ── Função Renal ───────────────────────────────────────────────────────
  ureia:         { male: { min: 15, max: 50 }, female: { min: 15, max: 45 }, descricao: "Resíduo do metabolismo de proteínas filtrado pelos rins. Elevada pode indicar desidratação ou sobrecarga renal." },
  creatinina:    { male: { min: 0.7, max: 1.3 }, female: { min: 0.5, max: 1.1 }, descricao: "Resíduo muscular filtrado pelos rins. Valor elevado pode sinalizar sobrecarga ou lesão renal." },
  "acido-urico": { male: { min: 3.5, max: 7.2 }, female: { min: 2.6, max: 6.0 }, descricao: "Produto da quebra de purinas. Elevado causa gota e pode sobrecarregar os rins." },

  // ── Eletrólitos ────────────────────────────────────────────────────────
  sodio:    { universal: { min: 136, max: 145 }, descricao: "Mineral que regula líquidos corporais e pressão arterial. Desequilíbrios afetam coração e neurônios." },
  potassio: { universal: { min: 3.5, max: 5.1 }, descricao: "Mineral essencial para o coração e músculos. Desequilíbrios podem causar arritmias." },
  calcio:   { universal: { min: 8.5, max: 10.5 }, descricao: "Mineral fundamental para ossos, dentes e contração muscular. Baixo indica risco de osteoporose." },
  magnesio: { universal: { min: 1.7, max: 2.5  }, descricao: "Mineral que participa de mais de 300 reações enzimáticas. Deficiência causa câimbras, fadiga e irritabilidade." },
  fosforo:  { universal: { min: 2.5, max: 4.5  }, descricao: "Trabalha junto com o cálcio na saúde óssea e na produção de energia celular." },
  cloro:    { universal: { min: 98,  max: 106  }, descricao: "Eletrólito que mantém o equilíbrio ácido-base e o volume de líquidos. Avaliado junto com sódio e potássio." },

  // ── Função Hepática ────────────────────────────────────────────────────
  "ast-tgo":            { male: { min: 10, max: 40  }, female: { min: 10, max: 32  }, descricao: "Enzima presente no fígado e músculos. Elevada indica dano hepático ou muscular." },
  ast:                  { descricao: "Enzima presente no fígado e músculos. Elevada indica dano hepático ou muscular." },
  tgo:                  { descricao: "Enzima presente no fígado e músculos. Elevada indica dano hepático ou muscular." },
  "alt-tgp":            { male: { min: 10, max: 56  }, female: { min: 10, max: 41  }, descricao: "Enzima mais específica do fígado. Principal marcador de inflamação ou lesão hepática." },
  alt:                  { descricao: "Enzima mais específica do fígado. Principal marcador de inflamação ou lesão hepática." },
  tgp:                  { descricao: "Enzima mais específica do fígado. Principal marcador de inflamação ou lesão hepática." },
  ggt:                  { male: { min: 7,  max: 73  }, female: { min: 7,  max: 38  }, descricao: "Enzima hepática sensível ao álcool e a medicamentos. Elevada indica sobrecarga hepática." },
  "fosfatase-alcalina": { male: { min: 40, max: 130 }, female: { min: 35, max: 105 }, descricao: "Enzima presente no fígado e nos ossos. Elevada pode indicar doença hepática ou óssea." },
  "bilirrubina-total":  { universal: { min: 0.2, max: 1.2 }, descricao: "Pigmento formado pela degradação dos glóbulos vermelhos. Elevada causa icterícia (pele amarelada)." },
  "bilirrubina-direta": { universal: { max: 0.4 }, descricao: "Fração da bilirrubina já processada pelo fígado. Elevada indica obstrução das vias biliares." },
  albumina:             { universal: { min: 3.5, max: 5.0 }, descricao: "Principal proteína do sangue, produzida pelo fígado. Baixa indica desnutrição ou doença hepática." },
  "proteinas-totais":   { universal: { min: 6.0, max: 8.3 }, descricao: "Soma das proteínas no sangue. Reflete o estado nutricional e a função hepática." },

  // ── Tireoide ───────────────────────────────────────────────────────────
  tsh:        { universal: { min: 0.4, max: 4.0 }, descricao: "Hormônio que regula a tireoide, que por sua vez controla metabolismo, energia e temperatura corporal." },
  "t4-livre": { universal: { min: 0.8, max: 1.8 }, descricao: "Hormônio tireoidiano ativo no sangue. Baixo causa lentidão metabólica; alto, aceleração." },
  "t3-livre": { universal: { min: 2.3, max: 4.2 }, descricao: "Forma mais ativa dos hormônios tireoidianos. Regula o metabolismo celular e a temperatura corporal." },
  "anti-tpo": { universal: { max: 35 }, descricao: "Anticorpo contra a tireoide. Elevado indica tireoidite autoimune (ex.: Hashimoto)." },

  // ── Vitaminas ──────────────────────────────────────────────────────────
  "vitamina-d":   { universal: { min: 30, max: 100 }, descricao: "Regula imunidade, ossos e humor. Deficiência é silenciosa, muito comum e fácil de corrigir." },
  "vitamina-b12": { universal: { min: 200, max: 900 }, descricao: "Essencial para neurônios e glóbulos vermelhos. Deficiência causa fadiga e formigamentos." },
  "acido-folico": { universal: { min: 5.4 }, descricao: "Vitamina B9 — essencial para produção de células e DNA. Crítica na gravidez para prevenir malformações." },

  // ── Oximetria / Gasometria ─────────────────────────────────────────────
  // Mantém SpO₂ separado de saturações de gasometria para não misturar venoso com arterial.
  "saturacao-oxigenio": { universal: { min: 95 }, descricao: "Saturação periférica de oxigênio (SpO₂) estimada por oxímetro. Valores abaixo do esperado devem ser confirmados no contexto clínico e, quando necessário, por gasometria." },
  "saturacao-oxigenio-arterial": { universal: { min: 95 }, descricao: "Saturação arterial de oxigênio (SaO₂) medida ou calculada em gasometria arterial. Reflete a fração da hemoglobina arterial ligada ao oxigênio e não deve ser misturada com saturação venosa." },
  "saturacao-o2-arterial": { universal: { min: 95 }, descricao: "Saturação arterial de oxigênio (SaO₂) medida ou calculada em gasometria arterial. Reflete a fração da hemoglobina arterial ligada ao oxigênio e não deve ser misturada com saturação venosa." },
  "saturacao-oxigenio-venoso": { descricao: "Saturação venosa de oxigênio (SvO₂ ou saturação venosa central/mista, conforme a amostra). Reflete o balanço entre oferta e consumo de oxigênio; não é SpO₂ e não indica hipoxemia arterial isoladamente." },
  "saturacao-o2-venosa": { descricao: "Saturação venosa de oxigênio (SvO₂ ou saturação venosa central/mista, conforme a amostra). Reflete o balanço entre oferta e consumo de oxigênio; não é SpO₂ e não indica hipoxemia arterial isoladamente." },
  "po2-arterial": { universal: { min: 80, max: 100 }, descricao: "Pressão parcial arterial de oxigênio (PaO₂). Avalia a oxigenação no sangue arterial e deve ser interpretada junto com FiO₂, idade, altitude e quadro clínico." },
  "po2-venoso": { universal: { min: 25, max: 40 }, descricao: "Pressão parcial venosa de oxigênio (PvO₂). Representa oxigênio remanescente no sangue venoso e não deve ser comparada diretamente com a PaO₂ arterial." },
  "pco2-arterial": { universal: { min: 35, max: 45 }, descricao: "Pressão parcial arterial de dióxido de carbono (PaCO₂). Indica ventilação alveolar e participa da avaliação de distúrbios ácido-base respiratórios." },
  "pco2-venoso": { universal: { min: 41, max: 51 }, descricao: "Pressão parcial venosa de dióxido de carbono (PvCO₂). Costuma ser mais alta que a arterial e deve ser interpretada conforme o tipo de amostra e o contexto clínico." },
  be: { universal: { min: -2, max: 2 }, descricao: "Excesso de base (B.E. ou Base Excess) da gasometria. Ajuda a identificar componente metabólico de acidose ou alcalose; valores negativos sugerem déficit de base e valores positivos sugerem excesso de base." },
  "b-e": { universal: { min: -2, max: 2 }, descricao: "Excesso de base (B.E. ou Base Excess) da gasometria. Ajuda a identificar componente metabólico de acidose ou alcalose; valores negativos sugerem déficit de base e valores positivos sugerem excesso de base." },
  "b.e": { universal: { min: -2, max: 2 }, descricao: "Excesso de base (B.E. ou Base Excess) da gasometria. Ajuda a identificar componente metabólico de acidose ou alcalose; valores negativos sugerem déficit de base e valores positivos sugerem excesso de base." },
  "b.e.": { universal: { min: -2, max: 2 }, descricao: "Excesso de base (B.E. ou Base Excess) da gasometria. Ajuda a identificar componente metabólico de acidose ou alcalose; valores negativos sugerem déficit de base e valores positivos sugerem excesso de base." },
  "base-excess": { universal: { min: -2, max: 2 }, descricao: "Excesso de base (B.E. ou Base Excess) da gasometria. Ajuda a identificar componente metabólico de acidose ou alcalose; valores negativos sugerem déficit de base e valores positivos sugerem excesso de base." },
  "excesso-base": { universal: { min: -2, max: 2 }, descricao: "Excesso de base (B.E. ou Base Excess) da gasometria. Ajuda a identificar componente metabólico de acidose ou alcalose; valores negativos sugerem déficit de base e valores positivos sugerem excesso de base." },
  "excesso-de-base": { universal: { min: -2, max: 2 }, descricao: "Excesso de base (B.E. ou Base Excess) da gasometria. Ajuda a identificar componente metabólico de acidose ou alcalose; valores negativos sugerem déficit de base e valores positivos sugerem excesso de base." },

  // ── Coagulação / Cardiologia ───────────────────────────────────────────
  "tempo-protrombina": { universal: { min: 11, max: 15   }, descricao: "Tempo de Protrombina (TP). Avalia a via extrínseca da coagulação. Prolongado indica risco de sangramento ou uso de anticoagulante." },
  inr:                 { universal: { min: 0.8, max: 1.2 }, descricao: "Índice Normalizado Internacional. Padronização do TP; > 1.8 indica anticoagulação excessiva ou coagulopatia." },
  ttpa:                { universal: { min: 25, max: 35   }, descricao: "Tempo de Tromboplastina Parcial Ativada. Avalia a via intrínseca. Prolongado indica deficiência de fator ou uso de heparina." },
  fibrinogenio:        { universal: { min: 200, max: 400 }, descricao: "Proteína essencial para a formação do coágulo. Baixo indica coagulopatia de consumo; alto, risco trombótico ou inflamação." },
  "d-dimero":          { universal: { max: 0.5           }, descricao: "Produto de degradação da fibrina. Elevado sugere trombose ativa (TEP, TVP, CIVD). Valor > 0.75 µg/mL FEU = crítico." },
  troponina: { descricao: "Marcador de lesão miocárdica. Deve ser interpretado com sintomas, ECG e variação seriada; valores de referência dependem do método do laboratório." },
  "troponina-i": { descricao: "Troponina I cardíaca. Marcador de lesão miocárdica; sua interpretação depende do método, do percentil 99 do ensaio, do delta seriado e do contexto clínico." },
  "troponina-t": { descricao: "Troponina T cardíaca. Marcador de lesão miocárdica; sua interpretação depende do método, do percentil 99 do ensaio, do delta seriado e do contexto clínico." },
  "troponina-ultra-sensivel": { descricao: "Troponina cardíaca ultra sensível (alta sensibilidade). Detecta pequenas lesões miocárdicas; o ponto de corte depende do ensaio e deve ser interpretado com delta seriado, sintomas e ECG." },
  "troponina-ultrassensivel": { descricao: "Troponina cardíaca ultra sensível (alta sensibilidade). Detecta pequenas lesões miocárdicas; o ponto de corte depende do ensaio e deve ser interpretado com delta seriado, sintomas e ECG." },
  "troponina-i-ultra-sensivel": { descricao: "Troponina I ultra sensível. Detecta pequenas lesões miocárdicas; o ponto de corte depende do ensaio e deve ser interpretado com delta seriado, sintomas e ECG." },
  "troponina-t-ultra-sensivel": { descricao: "Troponina T ultra sensível. Detecta pequenas lesões miocárdicas; o ponto de corte depende do ensaio e deve ser interpretado com delta seriado, sintomas e ECG." },
  "troponina-alta-sensibilidade": { descricao: "Troponina cardíaca de alta sensibilidade. Detecta pequenas lesões miocárdicas; o ponto de corte depende do ensaio e deve ser interpretado com delta seriado, sintomas e ECG." },
  "troponina-us": { descricao: "Troponina cardíaca ultra sensível. Detecta pequenas lesões miocárdicas; o ponto de corte depende do ensaio e deve ser interpretado com delta seriado, sintomas e ECG." },
  "hs-troponina": { descricao: "Troponina cardíaca de alta sensibilidade (hs-troponin). Detecta pequenas lesões miocárdicas; o ponto de corte depende do ensaio e deve ser interpretado com delta seriado, sintomas e ECG." },

  // ── Inflamação / Ferro ─────────────────────────────────────────────────
  "proteina-c-reativa":                    { universal: { max: 5 }, descricao: "Marcador de inflamação aguda. Elevada indica infecção ativa, inflamação ou risco cardiovascular." },
  pcr:                                     { descricao: "Marcador de inflamação aguda. Elevada indica infecção ativa, inflamação ou risco cardiovascular." },
  "proteina-c-reativa-ultrassensivel":     { descricao: "Marcador de inflamação aguda. Elevada indica infecção ativa, inflamação ou risco cardiovascular." },
  "proteina-c-reativa-us":                 { descricao: "Marcador de inflamação aguda. Elevada indica infecção ativa, inflamação ou risco cardiovascular." },
  vhs:                      { male: { max: 15 }, female: { max: 20 }, descricao: "Velocidade de sedimentação — indica inflamação inespecífica. Útil para monitorar doenças crônicas." },
  ferritina:                { male: { min: 30, max: 400 }, female: { min: 13, max: 150 }, descricao: "Proteína que armazena ferro. Baixa indica anemia ferropriva; alta pode indicar inflamação ou sobrecarga de ferro." },
  "ferro-serico":           { male: { min: 70, max: 180 }, female: { min: 60, max: 160 }, descricao: "Ferro em circulação no sangue. Baixo causa anemia; deve ser interpretado junto com ferritina e TIBC." },
  tibc:                     { universal: { min: 240, max: 450 }, descricao: "Capacidade total de ligação do ferro. Elevada indica deficiência de ferro; baixa, sobrecarga ou inflamação." },
  "saturacao-transferrina": { universal: { min: 20,  max: 50  }, descricao: "Percentual da transferrina ocupado por ferro. Baixo confirma deficiência; alto indica sobrecarga." },
  "indice-saturacao-transferrina": { universal: { min: 20,  max: 50  }, descricao: "Índice de saturação da transferrina. Mostra o percentual da transferrina ocupado por ferro; baixo sugere deficiência de ferro e alto pode indicar sobrecarga." },

  // ── Hormônios ──────────────────────────────────────────────────────────
  cortisol:             { universal: { min: 5, max: 25 }, descricao: "Hormônio do estresse produzido pelas adrenais. Regula energia, imunidade e resposta ao estresse." },
  "testosterona-total": { male: { min: 270, max: 1070 }, female: { min: 15, max: 70 }, descricao: "Principal hormônio sexual masculino, presente em ambos os sexos. Influencia libido, massa muscular e humor." },
  "testosterona-biodisponivel": { descricao: "Fração da testosterona disponível para ação nos tecidos, calculada a partir da testosterona total, SHBG e albumina. Ajuda a avaliar sintomas quando a testosterona total isolada não explica o quadro." },
  "testosterona-biodisponível": { descricao: "Fração da testosterona disponível para ação nos tecidos, calculada a partir da testosterona total, SHBG e albumina. Ajuda a avaliar sintomas quando a testosterona total isolada não explica o quadro." },
  shbg: { descricao: "Globulina ligadora de hormônios sexuais. Controla quanto da testosterona e do estradiol fica livre ou biodisponível; alterações mudam a interpretação dos hormônios totais." },
  fsh:          { descricao: "Hormônio folículo-estimulante, da hipófise. Regula ovários e testículos; usado para avaliar fertilidade e menopausa." },
  lh:           { descricao: "Hormônio luteinizante, da hipófise. Controla a ovulação e a produção de testosterona; avalia fertilidade e função gonadal." },
  estradiol:    { descricao: "Principal estrogênio. Regula o ciclo menstrual e a saúde óssea; varia conforme a fase do ciclo e a menopausa." },
  progesterona: { descricao: "Hormônio que prepara o útero para a gravidez e regula o ciclo menstrual. Útil para confirmar a ovulação." },
  prolactina:   { male: { min: 2, max: 18 }, female: { min: 2, max: 29 }, descricao: "Hormônio que estimula a produção de leite. Elevada fora da gravidez pode causar irregularidade menstrual e infertilidade." },
};

export function getReference(
  slug: string,
  sex: string | null,
  _ageYears: number | null,
): BiomarkerRange | null {
  const entry = REFERENCES[slug];
  if (!entry) return null;
  if (entry.universal) return entry.universal;
  if (sex === "masculino" && entry.male) return entry.male;
  if (sex === "feminino" && entry.female) return entry.female;
  // Se sexo desconhecido e só existe um lado, usa como fallback
  if (entry.male && !entry.female) return entry.male;
  if (entry.female && !entry.male) return entry.female;
  return null;
}

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NORMALIZED_KEYS: Record<string, string> = Object.keys(REFERENCES).reduce(
  (acc, key) => { acc[normalizeText(key)] = key; return acc; },
  {} as Record<string, string>,
);

const KEYWORD_ALIASES: [RegExp, string][] = [
  [/gama glutamil|glutamil transferase|gama gt|\bggt\b/, "ggt"],
  [/foliculo estimulante|\bfsh\b/, "fsh"],
  [/luteinizante|\blh\b/, "lh"],
  [/prolactina/, "prolactina"],
  [/estradiol/, "estradiol"],
  [/progesterona/, "progesterona"],
  [/aspartato|transaminase oxalacetica|\bast\b|\btgo\b/, "ast-tgo"],
  [/alanina|transaminase piruvica|\balt\b|\btgp\b/, "alt-tgp"],
  [/proteina c reativa|\bpcr\b/, "proteina-c-reativa"],
  [/triglicer/, "triglicerides"],
  [/colesterol hdl|hdl colesterol/, "hdl-colesterol"],
  [/colesterol ldl|ldl colesterol/, "ldl-colesterol"],
  [/colesterol total/, "colesterol-total"],
  [/linfocit/, "linfocitos"],
  [/neutrofil/, "neutrofilos"],
  [/monocit/, "monocitos"],
  [/eosinofil/, "eosinofilos"],
  [/basofil/, "basofilos"],
  [/hemacia|eritrocit/, "hemacias"],
  [/reticulocit/, "reticulocitos"],
  [/plaqueta/, "plaquetas"],
  [/leucocit/, "leucocitos"],
  [/hematocrit/, "hematocrito"],
  [/hemoglobina glicada|hemoglobina glicosilada|\ba1c\b|hba1c/, "hemoglobina-glicada"],
  [/\bhemoglobina\b/, "hemoglobina"],
  [/glicemia|glicose/, "glicose"],
  [/creatinina/, "creatinina"],
  [/acido urico/, "acido-urico"],
  [/vitamina d|25 hidroxi/, "vitamina-d"],
  [/vitamina b12|cobalamina/, "vitamina-b12"],
  [/acido folico|folato/, "acido-folico"],
  [/ferritina/, "ferritina"],
  [/\bb\s*e\b|base excess|excesso.*base|base.*excess/, "base-excess"],
  [/troponina.*(ultra sensivel|ultrassensivel|alta sensibilidade)|troponina\s*us|hs\s*troponina|troponina.*\bhs\b/, "troponina-ultra-sensivel"],
  [/troponina\s*i/, "troponina-i"],
  [/troponina\s*t/, "troponina-t"],
  [/troponina/, "troponina"],
  [/saturacao.*transferrina|indice.*saturacao.*transferrina/, "indice-saturacao-transferrina"],
  [/testosterona.*biodisponivel/, "testosterona-biodisponivel"],
  [/\bshbg\b|globulina transportadora.*hormonios sexuais|globulina ligadora.*hormonios sexuais/, "shbg"],
  [/\btsh\b|tireoestimulante/, "tsh"],
  [/saturacao.*(venosa|venoso)/, "saturacao-oxigenio-venoso"],
  [/saturacao.*arterial/, "saturacao-oxigenio-arterial"],
  [/\bspo2\b|oximetria|saturacao.*(oxigenio|o2)/, "saturacao-oxigenio"],
  [/\bpao2\b|po2.*arterial|pressao parcial.*oxigenio.*arterial/, "po2-arterial"],
  [/\bpvo2\b|po2.*venos|pressao parcial.*oxigenio.*venos/, "po2-venoso"],
  [/\bpaco2\b|pco2.*arterial|pressao parcial.*dioxido.*carbono.*arterial|pressao parcial.*co2.*arterial/, "pco2-arterial"],
  [/\bpvco2\b|pco2.*venos|pressao parcial.*dioxido.*carbono.*venos|pressao parcial.*co2.*venos/, "pco2-venoso"],
  [/protrombina|\btp\b/, "tempo-protrombina"],
  [/\binr\b/, "inr"],
  [/tromboplastina.*parcial|\bttpa\b|\baptt\b/, "ttpa"],
  [/fibrinogenio|fibrinogênio/, "fibrinogenio"],
  [/d.dimero|dimero.d/, "d-dimero"],
  [/\bcloro\b|cloreto/, "cloro"],
  [/prolactina/, "prolactina"],
];

export function getBiomarkerInfo(slug?: string | null, name?: string | null): string | null {
  if (slug && REFERENCES[slug]?.descricao) return REFERENCES[slug]!.descricao!;

  const candidates = [slug, name].filter(Boolean) as string[];

  for (const c of candidates) {
    const canonical = NORMALIZED_KEYS[normalizeText(c)];
    if (canonical && REFERENCES[canonical].descricao) return REFERENCES[canonical].descricao!;
  }

  const haystack = normalizeText(candidates.join(" "));
  for (const [re, canonical] of KEYWORD_ALIASES) {
    if (re.test(haystack)) {
      const d = REFERENCES[canonical]?.descricao;
      if (d) return d;
    }
  }

  return null;
}

export function inferStatus(
  value: number,
  ref: BiomarkerRange,
): "optimal" | "high" | "low" | "critical" {
  const { min, max } = ref;
  if (max !== undefined && value > max) {
    return value > max * 1.5 ? "critical" : "high";
  }
  if (min !== undefined && value < min) {
    return value < min * 0.5 ? "critical" : "low";
  }
  return "optimal";
}
