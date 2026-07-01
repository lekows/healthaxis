function removeAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

// Converts any OCR-produced slug to a stable canonical form.
// Rationale: the same biomarker gets different slugs across exams
// (e.g. tgo-ast vs ast-tgo, ácido-úrico vs acido-urico).
// Keeping a single canonical key prevents duplicate rows in `biomarkers`.
const SLUG_SYNONYMS: Record<string, string> = {
  // Hepatic enzymes — OCR reverses order or uses short names
  "tgo-ast":      "ast-tgo",
  "ast":          "ast-tgo",
  "tgo":          "ast-tgo",
  "tgp-alt":      "alt-tgp",
  "alt":          "alt-tgp",
  "tgp":          "alt-tgp",
  // Lipids
  "colesterol-hdl":  "hdl-colesterol",
  "hdl":             "hdl-colesterol",
  "colesterol-ldl":  "ldl-colesterol",
  "ldl":             "ldl-colesterol",
  "colesterol-vldl": "vldl",
  "colesterol-total-vldl": "vldl",
  // PCR variants
  "pcr":                          "proteina-c-reativa",
  "proteina-c-reativa-us":        "proteina-c-reativa",
  "proteina-c-reativa-ultrassensivel": "proteina-c-reativa",
  // Glicemia
  "glicemia":         "glicose",
  "hemoglobina-a1c":  "hemoglobina-glicada",
  "hba1c":            "hemoglobina-glicada",
  "a1c":              "hemoglobina-glicada",
  // Eritrócitos
  "eritrocitos":      "hemacias",
  // Thyroid
  "t4livre":          "t4-livre",
  "t3livre":          "t3-livre",
  // Folate
  "folato":           "acido-folico",
  // Neutrophils
  "neutrofilos-segmentados": "neutrofilos",
  "segmentados":             "neutrofilos",
  "bastonetes":              "neutrofilos-bastonetes",
  // Iron
  "ferro":            "ferro-serico",
  "saturacao-de-transferrina": "saturacao-transferrina",
  // Oxygen saturation (SpO2) — distinct from iron/transferrin saturation
  "saturacao-de-oxigenio":            "saturacao-oxigenio",
  "saturacao-periferica":             "saturacao-oxigenio",
  "saturacao-periferica-de-oxigenio": "saturacao-oxigenio",
  "saturacao-o2":                     "saturacao-oxigenio",
  "saturacao-o2-venosa":              "saturacao-oxigenio",
  "saturacao-o2-arterial":            "saturacao-oxigenio",
  "saturacao-venosa":                 "saturacao-oxigenio",
  "spo2":                             "saturacao-oxigenio",
  "sp02":                             "saturacao-oxigenio",
  "oximetria-de-pulso":               "saturacao-oxigenio",
  // Coagulação
  "tp":                       "tempo-protrombina",
  "protrombina":              "tempo-protrombina",
  "tempo-de-protrombina":     "tempo-protrombina",
  "t-protrombina":            "tempo-protrombina",
  "tromboplastina":           "ttpa",
  "tempo-tromboplastina":     "ttpa",
  "aptt":                     "ttpa",
  "dimero-d":                 "d-dimero",
  "atividade-de-protrombina": "atividade-protrombina",
  "atividade-protrombinica":  "atividade-protrombina",
  "relacao-protrombina":      "protrombina-relacao",
  "tp-relacao":               "protrombina-relacao",
  "relacao-tp":               "protrombina-relacao",
  "relacao-ttpa":             "ttpa-relacao",
  "relacao-aptt":             "ttpa-relacao",
  "aptt-relacao":             "ttpa-relacao",
  // Eletrólitos
  "cloreto":                  "cloro",
  "cloreto-serico":           "cloro",
  "calcio-ionizado":          "calcio-ionico",
  "ca-ionico":                "calcio-ionico",
  "calcio-ionico-serico":     "calcio-ionico",
  // Gasometria
  "acido-latico":             "lactato",
  "lactato-venoso":           "lactato",
  "lactato-arterial":         "lactato",
  "ph-sanguineo":             "ph-arterial",
  "bicarbonato":              "hco3-arterial",
  "hco3":                     "hco3-arterial",
  "bicarbonato-arterial":     "hco3-arterial",
  "bicarbonato-venoso":       "hco3-venoso",
  "be":                       "base-excess",
  "b-e":                      "base-excess",
  "excesso-de-base":          "base-excess",
  "excesso-base":             "base-excess",
  "be-venoso":                "base-excess-venoso",
  "excesso-de-base-venoso":   "base-excess-venoso",
  // Função renal — taxa de filtração glomerular estimada
  "egfr":                     "taxa-filtracao-glomerular",
  "tfg":                      "taxa-filtracao-glomerular",
  "etfg":                     "taxa-filtracao-glomerular",
  "e-tfg":                    "taxa-filtracao-glomerular",
  "tfg-estimada":             "taxa-filtracao-glomerular",
  "taxa-de-filtracao-glomerular": "taxa-filtracao-glomerular",
  "filtracao-glomerular":     "taxa-filtracao-glomerular",
  "ritmo-de-filtracao-glomerular": "taxa-filtracao-glomerular",
  "ckd-epi":                  "taxa-filtracao-glomerular",
  // Cardíacos
  "nt-pro-bnp":               "nt-probnp",
  "ntprobnp":                 "nt-probnp",
  "pro-bnp":                  "nt-probnp",
  "nt-probnp-peptideo":       "nt-probnp",
};

export function canonicalSlug(raw: string): string {
  const normalized = removeAccents(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return SLUG_SYNONYMS[normalized] ?? normalized;
}
