import { describe, it, expect } from "vitest";
import { overlaps, findConflicts, hasConflict } from "../appointments/conflicts";
import {
  BLOCKING_STATUSES, isBlocking, isTerminal, canMarkNoShow,
  statusLabel, type AppointmentStatus,
} from "../appointments/status";

const at = (h: number, m = 0) => new Date(2026, 5, 26, h, m).toISOString();

describe("overlaps — sobreposição de intervalos", () => {
  it("intervalos que se cruzam → true", () => {
    expect(overlaps(at(9), at(10), at(9, 30), at(10, 30))).toBe(true);
  });
  it("intervalos disjuntos → false", () => {
    expect(overlaps(at(9), at(10), at(11), at(12))).toBe(false);
  });
  it("encostam na borda (fim de um = início do outro) → false", () => {
    expect(overlaps(at(9), at(10), at(10), at(11))).toBe(false);
  });
  it("um contido no outro → true", () => {
    expect(overlaps(at(9), at(12), at(10), at(11))).toBe(true);
  });
  it("data inválida → false (não bloqueia por erro de parse)", () => {
    expect(overlaps("nope", at(10), at(9), at(11))).toBe(false);
  });
});

describe("findConflicts — só status que bloqueiam horário", () => {
  const candidate = { starts_at: at(9), ends_at: at(10) };

  it("consulta 'scheduled' sobreposta → conflito", () => {
    const existing = [{ id: "x", starts_at: at(9, 30), ends_at: at(10, 30), status: "scheduled" as AppointmentStatus }];
    expect(findConflicts(candidate, existing)).toHaveLength(1);
  });
  it("consulta 'cancelled' sobreposta → NÃO conflita", () => {
    const existing = [{ id: "x", starts_at: at(9, 30), ends_at: at(10, 30), status: "cancelled" as AppointmentStatus }];
    expect(findConflicts(candidate, existing)).toHaveLength(0);
  });
  it("consulta 'requested' sobreposta → NÃO bloqueia (ainda não é compromisso firme)", () => {
    const existing = [{ id: "x", starts_at: at(9, 30), ends_at: at(10, 30), status: "requested" as AppointmentStatus }];
    expect(findConflicts(candidate, existing)).toHaveLength(0);
  });
  it("ignora a própria consulta ao remarcar (mesmo id)", () => {
    const existing = [{ id: "same", starts_at: at(9, 30), ends_at: at(10, 30), status: "confirmed" as AppointmentStatus }];
    expect(findConflicts({ ...candidate, id: "same" }, existing)).toHaveLength(0);
  });
  it("hasConflict reflete findConflicts", () => {
    const existing = [{ id: "x", starts_at: at(9, 30), ends_at: at(10, 30), status: "confirmed" as AppointmentStatus }];
    expect(hasConflict(candidate, existing)).toBe(true);
  });
});

describe("status — bloqueio, terminal e regras", () => {
  it("BLOCKING_STATUSES contém scheduled/confirmed/arrived", () => {
    expect([...BLOCKING_STATUSES].sort()).toEqual(["arrived", "confirmed", "scheduled"]);
  });
  it("isBlocking: confirmed sim, requested não", () => {
    expect(isBlocking("confirmed")).toBe(true);
    expect(isBlocking("requested")).toBe(false);
  });
  it("isTerminal: cancelled/completed/no_show/rescheduled", () => {
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("rescheduled")).toBe(true);
    expect(isTerminal("scheduled")).toBe(false);
  });
  it("statusLabel traduz para pt-BR", () => {
    expect(statusLabel("no_show")).toBe("Faltou");
  });
});

describe("canMarkNoShow — só depois do horário", () => {
  it("antes do horário → false", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(canMarkNoShow(future)).toBe(false);
  });
  it("após o horário → true", () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    expect(canMarkNoShow(past)).toBe(true);
  });
  it("data inválida → false", () => {
    expect(canMarkNoShow("nope")).toBe(false);
  });
});
