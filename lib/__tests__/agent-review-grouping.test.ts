import { describe, it, expect } from "vitest";
import { groupReviewsByPatient } from "../agent-review-grouping";
import type { AgentReviewQueueItem, AgentHumanDecision } from "../supabase/agent-review-queries";

function makeReview(overrides: Partial<AgentReviewQueueItem> & { id: string; patient_id: string; completed_at: string }): AgentReviewQueueItem {
  return {
    agent_name: "consultation_prep",
    model_used: "claude-haiku",
    confidence_score: 0.8,
    output_json: {},
    edited_output: null,
    human_decision: "pending" as AgentHumanDecision,
    human_decision_by: null,
    human_decision_at: null,
    status: "completed",
    created_at: overrides.completed_at,
    patient: { id: overrides.patient_id, name: "Salazar Hildalgo", dob: null, sex: null },
    ...overrides,
  } as AgentReviewQueueItem;
}

describe("groupReviewsByPatient", () => {
  it("colapsa 5 análises do mesmo paciente em 1 grupo, mais recente primeiro", () => {
    const items = [
      makeReview({ id: "a", patient_id: "p1", completed_at: "2026-06-26T10:00:00Z" }),
      makeReview({ id: "b", patient_id: "p1", completed_at: "2026-06-30T10:00:00Z" }),
      makeReview({ id: "c", patient_id: "p1", completed_at: "2026-06-28T10:00:00Z" }),
      makeReview({ id: "d", patient_id: "p1", completed_at: "2026-06-27T10:00:00Z" }),
      makeReview({ id: "e", patient_id: "p1", completed_at: "2026-06-29T10:00:00Z" }),
    ];
    const groups = groupReviewsByPatient(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].reviews[0].id).toBe("b"); // mais recente
    expect(groups[0].reviews.slice(1)).toHaveLength(4);
    expect(groups[0].pendingCount).toBe(5);
  });

  it("conta pendências corretamente por grupo", () => {
    const items = [
      makeReview({ id: "a", patient_id: "p1", completed_at: "2026-06-30T10:00:00Z", human_decision: "accepted" }),
      makeReview({ id: "b", patient_id: "p1", completed_at: "2026-06-29T10:00:00Z", human_decision: "pending" }),
    ];
    const groups = groupReviewsByPatient(items);
    expect(groups[0].pendingCount).toBe(1);
  });

  it("ordena grupos: com pendência antes, depois por data mais recente", () => {
    const items = [
      // paciente sem pendência, mas mais recente
      makeReview({ id: "a", patient_id: "p1", completed_at: "2026-07-01T10:00:00Z", human_decision: "accepted" }),
      // paciente com pendência, mais antigo
      makeReview({ id: "b", patient_id: "p2", completed_at: "2026-06-20T10:00:00Z", human_decision: "pending" }),
      // paciente com pendência, ainda mais recente
      makeReview({ id: "c", patient_id: "p3", completed_at: "2026-06-25T10:00:00Z", human_decision: "pending" }),
    ];
    const groups = groupReviewsByPatient(items);
    expect(groups.map((g) => g.patientId)).toEqual(["p3", "p2", "p1"]);
  });
});
