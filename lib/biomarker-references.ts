export interface BiomarkerRange {
  min?: number;
  max?: number;
}

interface SexRanges {
  male?: BiomarkerRange;
  female?: BiomarkerRange;
  universal?: BiomarkerRange;
}

const REFERENCES: Record<string, SexRanges> = {
  // ── Hemograma ──────────────────────────────────────────────────────────
  hemoglobina:        { male: { min: 13.5, max: 17.5 }, female: { min: 12.0, max: 16.0 } },
  hematocrito:        { male: { min: 41,   max: 53   }, female: { min: 36,   max: 46   } },
  vcm:                { universal: { min: 80,  max: 100  } },
  hcm:                { universal: { min: 27,  max: 33   } },
  chcm:               { universal: { min: 32,  max: 36   } },
  rdw:                { universal: { min: 11.5, max: 14.5 } },
  leucocitos:         { universal: { min: 4.0, max: 11.0 } },
  plaquetas:          { universal: { min: 150, max: 400  } },

  // ── Glicemia ───────────────────────────────────────────────────────────
  glicose:                { universal: { min: 70, max: 99    } },
  "hemoglobina-glicada":  { universal: { max: 5.7             } },
  insulina:               { universal: { min: 2.6, max: 24.9 } },

  // ── Lipídios ───────────────────────────────────────────────────────────
  "colesterol-total":  { universal: { max: 200 } },
  "ldl-colesterol":    { universal: { max: 130 } },
  "hdl-colesterol":    { male: { min: 40 }, female: { min: 50 } },
  triglicerides:       { universal: { max: 150 } },
  triglicerideos:      { universal: { max: 150 } },
  vldl:                { universal: { max: 30  } },

  // ── Função Renal ───────────────────────────────────────────────────────
  ureia:       { male: { min: 15, max: 50 }, female: { min: 15, max: 45 } },
  creatinina:  { male: { min: 0.7, max: 1.3 }, female: { min: 0.5, max: 1.1 } },
  "acido-urico": { male: { min: 3.5, max: 7.2 }, female: { min: 2.6, max: 6.0 } },

  // ── Eletrólitos ────────────────────────────────────────────────────────
  sodio:    { universal: { min: 136, max: 145 } },
  potassio: { universal: { min: 3.5, max: 5.1 } },
  calcio:   { universal: { min: 8.5, max: 10.5 } },
  magnesio: { universal: { min: 1.7, max: 2.5  } },
  fosforo:  { universal: { min: 2.5, max: 4.5  } },

  // ── Função Hepática ────────────────────────────────────────────────────
  "ast-tgo":           { male: { min: 10, max: 40  }, female: { min: 10, max: 32  } },
  "alt-tgp":           { male: { min: 10, max: 56  }, female: { min: 10, max: 41  } },
  ggt:                 { male: { min: 7,  max: 73  }, female: { min: 7,  max: 38  } },
  "fosfatase-alcalina":{ male: { min: 40, max: 130 }, female: { min: 35, max: 105 } },
  "bilirrubina-total": { universal: { min: 0.2, max: 1.2 } },
  "bilirrubina-direta":{ universal: { max: 0.4 } },
  albumina:            { universal: { min: 3.5, max: 5.0 } },
  "proteinas-totais":  { universal: { min: 6.0, max: 8.3 } },

  // ── Tireoide ───────────────────────────────────────────────────────────
  tsh:       { universal: { min: 0.4, max: 4.0 } },
  "t4-livre":{ universal: { min: 0.8, max: 1.8 } },
  "t3-livre":{ universal: { min: 2.3, max: 4.2 } },
  "anti-tpo":{ universal: { max: 35 } },

  // ── Vitaminas ──────────────────────────────────────────────────────────
  "vitamina-d":   { universal: { min: 30, max: 100 } },
  "vitamina-b12": { universal: { min: 200, max: 900 } },
  "acido-folico": { universal: { min: 5.4 } },

  // ── Inflamação / Ferro ─────────────────────────────────────────────────
  "proteina-c-reativa":    { universal: { max: 5   } },
  vhs:                     { male: { max: 15 }, female: { max: 20 } },
  ferritina:               { male: { min: 30, max: 400 }, female: { min: 13, max: 150 } },
  "ferro-serico":          { male: { min: 70, max: 180 }, female: { min: 60, max: 160 } },
  tibc:                    { universal: { min: 240, max: 450 } },
  "saturacao-transferrina":{ universal: { min: 20,  max: 50  } },

  // ── Hormônios ──────────────────────────────────────────────────────────
  cortisol:             { universal: { min: 5,   max: 25   } },
  "testosterona-total": { male: { min: 270, max: 1070 }, female: { min: 15, max: 70 } },
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
