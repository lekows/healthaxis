import { describe, it, expect } from "vitest";
import { inferStatus, getReference } from "../biomarker-references";
import { canonicalSlug } from "../biomarker-slug";

describe("inferStatus — regra principal", () => {
  it("B12=829, ref [200,900] → optimal (regressão do bug)", () => {
    expect(inferStatus(829, { min: 200, max: 900 })).toBe("optimal");
  });

  it("B12=195, ref [200,900] → low (abaixo do mínimo)", () => {
    expect(inferStatus(195, { min: 200, max: 900 })).toBe("low");
  });

  it("B12=80, ref [200,900] → critical (menos de 50% do mínimo)", () => {
    expect(inferStatus(80, { min: 200, max: 900 })).toBe("critical");
  });

  it("B12=1000, ref [200,900] → high (acima do máximo, abaixo de 150%)", () => {
    expect(inferStatus(1000, { min: 200, max: 900 })).toBe("high");
  });

  it("B12=1400, ref [200,900] → critical (acima de 150% do máximo)", () => {
    expect(inferStatus(1400, { min: 200, max: 900 })).toBe("critical");
  });
});

describe("inferStatus — biomarcadores comuns", () => {
  it("vitamina-d: 45 ng/mL dentro de [30,100] → optimal", () => {
    expect(inferStatus(45, { min: 30, max: 100 })).toBe("optimal");
  });

  it("vitamina-d: 18 ng/mL abaixo de [30,100] → low", () => {
    expect(inferStatus(18, { min: 30, max: 100 })).toBe("low");
  });

  it("ferritina: 120 ng/mL dentro de [15,200] → optimal", () => {
    expect(inferStatus(120, { min: 15, max: 200 })).toBe("optimal");
  });

  it("colesterol-ldl: 145 mg/dL acima de [0,130] → high", () => {
    expect(inferStatus(145, { min: 0, max: 130 })).toBe("high");
  });

  it("glicose: 88 mg/dL dentro de [70,99] → optimal", () => {
    expect(inferStatus(88, { min: 70, max: 99 })).toBe("optimal");
  });

  it("tsh: 3.2 mUI/L dentro de [0.4,4.0] → optimal", () => {
    expect(inferStatus(3.2, { min: 0.4, max: 4.0 })).toBe("optimal");
  });

  it("tsh: 6.0 mUI/L acima de [0.4,4.0] → high", () => {
    expect(inferStatus(6.0, { min: 0.4, max: 4.0 })).toBe("high");
  });
});

describe("getReference — referências estáticas canônicas", () => {
  it("vitamina-b12 retorna ref universal [200,900]", () => {
    const ref = getReference("vitamina-b12", undefined, undefined);
    expect(ref).toEqual({ min: 200, max: 900 });
  });

  it("glicose retorna referência para adulto", () => {
    const ref = getReference("glicose", undefined, 30);
    expect(ref).toBeDefined();
    if (ref) {
      expect(ref.min).toBeDefined();
      expect(ref.max).toBeDefined();
    }
  });

  it("status recomputado com ref estática corrige inconsistência B12=829", () => {
    const ref = getReference("vitamina-b12", undefined, undefined);
    expect(ref).not.toBeNull();
    expect(inferStatus(829, ref!)).toBe("optimal");
  });
});

describe("SpO2 — sem override canônico, ref do laboratório vence", () => {
  it("saturacao-oxigenio não tem referência canônica (labs divergem)", () => {
    expect(getReference("saturacao-oxigenio", null, null)).toBeNull();
  });

  it("SpO2 92% com ref Sabin [80,100] → optimal (bug original era critical)", () => {
    expect(inferStatus(92, { min: 80, max: 100 })).toBe("optimal");
  });

  it("SpO2 75% com ref Sabin [80,100] → low", () => {
    expect(inferStatus(75, { min: 80, max: 100 })).toBe("low");
  });
});

describe("Coagulação — novos biomarcadores", () => {
  it("INR 1.0 dentro de [0.8,1.2] → optimal", () => {
    expect(inferStatus(1.0, { min: 0.8, max: 1.2 })).toBe("optimal");
  });

  it("INR 1.5 acima de [0.8,1.2] → high", () => {
    expect(inferStatus(1.5, { min: 0.8, max: 1.2 })).toBe("high");
  });

  it("INR 2.0 acima de 1.5× máximo [0.8,1.2] → critical", () => {
    expect(inferStatus(2.0, { min: 0.8, max: 1.2 })).toBe("critical");
  });

  it("D-dímero 0.3 µg/mL dentro de [,0.5] → optimal", () => {
    expect(inferStatus(0.3, { max: 0.5 })).toBe("optimal");
  });

  it("D-dímero 1.0 µg/mL acima de 1.5× 0.5 → critical", () => {
    expect(inferStatus(1.0, { max: 0.5 })).toBe("critical");
  });

  it("getReference inr retorna [0.8,1.2]", () => {
    expect(getReference("inr", null, null)).toEqual({ min: 0.8, max: 1.2 });
  });

  it("getReference d-dimero retorna max 0.5", () => {
    expect(getReference("d-dimero", null, null)).toEqual({ max: 0.5 });
  });
});

describe("HDL — alto é sempre optimal (sem max canônico)", () => {
  it("HDL 80 mg/dL (acima do mínimo masculino) → optimal", () => {
    expect(inferStatus(80, { min: 40 })).toBe("optimal");
  });

  it("HDL 120 mg/dL → optimal (sem teto, não deve ser high)", () => {
    expect(inferStatus(120, { min: 40 })).toBe("optimal");
  });
});

describe("canonicalSlug — desambiguação SpO2 vs. transferrina", () => {
  it("spo2 → saturacao-oxigenio", () => {
    expect(canonicalSlug("spo2")).toBe("saturacao-oxigenio");
  });

  it("saturacao-de-oxigenio → saturacao-oxigenio", () => {
    expect(canonicalSlug("saturacao-de-oxigenio")).toBe("saturacao-oxigenio");
  });

  it("saturacao-de-transferrina → saturacao-transferrina (ferro)", () => {
    expect(canonicalSlug("saturacao-de-transferrina")).toBe("saturacao-transferrina");
  });

  it("slugs SpO2 e transferrina nunca colidem", () => {
    expect(canonicalSlug("saturacao-oxigenio")).not.toBe("saturacao-transferrina");
    expect(canonicalSlug("saturacao-transferrina")).not.toBe("saturacao-oxigenio");
  });

  it("tp → tempo-protrombina", () => {
    expect(canonicalSlug("tp")).toBe("tempo-protrombina");
  });

  it("cloreto → cloro", () => {
    expect(canonicalSlug("cloreto")).toBe("cloro");
  });

  it("aptt → ttpa", () => {
    expect(canonicalSlug("aptt")).toBe("ttpa");
  });
});
