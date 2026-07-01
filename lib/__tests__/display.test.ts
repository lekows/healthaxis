import { describe, it, expect } from "vitest";
import { getPatientDisplayName, getPatientInitials, isValidPatientName } from "../patient-display";
import { getAgentDisplayName } from "../agent-display";

describe("getPatientDisplayName — nome humano válido", () => {
  it("mantém um nome real", () => {
    expect(getPatientDisplayName({ name: "Salazar Hildalgo" })).toBe("Salazar Hildalgo");
  });

  it("faz trim do nome", () => {
    expect(getPatientDisplayName({ name: "  Ana Júlia  " })).toBe("Ana Júlia");
  });

  it("aceita acentos e hífens", () => {
    expect(isValidPatientName("Ana-Júlia Conceição")).toBe(true);
  });
});

describe("getPatientDisplayName — rejeita valores técnicos", () => {
  const fallback = "Paciente sem nome cadastrado";

  it("rejeita e-mail puro", () => {
    expect(getPatientDisplayName({ name: "junior.mesquita.teste@healthaxis.app" })).toBe(fallback);
  });

  it("rejeita UUID puro", () => {
    expect(getPatientDisplayName({ name: "3f9a1c2e-1b2d-4e5f-8a9b-0c1d2e3f4a5b" })).toBe(fallback);
  });

  it("rejeita placeholders e vazios", () => {
    for (const bad of ["", "   ", "Paciente", "undefined", "null", "N/A"]) {
      expect(getPatientDisplayName({ name: bad })).toBe(fallback);
    }
  });

  it("rejeita null/undefined patient", () => {
    expect(getPatientDisplayName(null)).toBe(fallback);
    expect(getPatientDisplayName(undefined)).toBe(fallback);
  });

  it("rejeita strings sem letras", () => {
    expect(getPatientDisplayName({ name: "12345" })).toBe(fallback);
  });
});

describe("getPatientInitials", () => {
  it("primeira + última palavra", () => {
    expect(getPatientInitials({ name: "Salazar Hildalgo" })).toBe("SH");
  });

  it("nome único → uma inicial", () => {
    expect(getPatientInitials({ name: "Madonna" })).toBe("M");
  });

  it("null quando não há nome humano", () => {
    expect(getPatientInitials({ name: "teste@healthaxis.app" })).toBeNull();
    expect(getPatientInitials({ name: "Paciente" })).toBeNull();
    expect(getPatientInitials(null)).toBeNull();
  });
});

describe("getAgentDisplayName", () => {
  it("mapeia nomes técnicos conhecidos", () => {
    expect(getAgentDisplayName("consultation_prep")).toBe("Preparação de consulta");
    expect(getAgentDisplayName("metabolic_analysis")).toBe("Análise metabólica");
    expect(getAgentDisplayName("cardiometabolic_review")).toBe("Revisão cardiometabólica");
  });

  it("converte snake_case desconhecido em título legível", () => {
    expect(getAgentDisplayName("foo_bar")).toBe("Foo Bar");
    expect(getAgentDisplayName("nova-rotina-clinica")).toBe("Nova Rotina Clinica");
  });

  it("fallback para vazio/nulo", () => {
    expect(getAgentDisplayName("")).toBe("Análise clínica de IA");
    expect(getAgentDisplayName(null)).toBe("Análise clínica de IA");
    expect(getAgentDisplayName(undefined)).toBe("Análise clínica de IA");
  });
});
