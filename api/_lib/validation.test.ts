import { describe, it, expect } from "vitest";
import { parseAiAssist } from "./validation.js";

describe("parseAiAssist", () => {
  it("aceita tarefa ligada a registro com entityType+entityId", () => {
    const r = parseAiAssist({
      task: "summarize_matter",
      entityType: "matter",
      entityId: "m_1",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.task).toBe("summarize_matter");
      expect(r.data.entityType).toBe("matter");
      expect(r.data.entityId).toBe("m_1");
    }
  });

  it("rejeita task inválido", () => {
    const r = parseAiAssist({ task: "hack" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("task");
  });

  it("rejeita entityType inválido", () => {
    const r = parseAiAssist({
      task: "next_steps",
      entityType: "planeta",
      entityId: "x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("entityType");
  });

  it("exige entityType+entityId para tarefas não-draft_notes", () => {
    const r = parseAiAssist({ task: "enrich_lead" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("obrigatórios");
  });

  it("draft_notes aceita contexto livre sem registro", () => {
    const r = parseAiAssist({ task: "draft_notes", context: "reunião com cliente" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.entityType).toBeNull();
      expect(r.data.entityId).toBeNull();
      expect(r.data.context).toBe("reunião com cliente");
    }
  });

  it("draft_notes também aceita ligado a registro", () => {
    const r = parseAiAssist({
      task: "draft_notes",
      entityType: "opportunity",
      entityId: "o_9",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.entityType).toBe("opportunity");
  });
});
