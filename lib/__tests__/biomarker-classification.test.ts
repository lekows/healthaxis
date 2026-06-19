import { describe, it, expect } from "vitest";
import { inferStatus, getReference } from "../biomarker-references";

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
