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
  // Eletrólitos
  "cloreto":                  "cloro",
  "cloreto-serico":           "cloro",
};

export function canonicalSlug(raw: string): string {
  const normalized = removeAccents(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return SLUG_SYNONYMS[normalized] ?? normalized;
}
