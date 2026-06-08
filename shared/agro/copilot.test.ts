import { describe, expect, it } from "vitest";
import { resolveCopilotQuery } from "./copilot.js";
import { computeCrmStats } from "./stats.js";
import {
  SEED_ACCOUNTS,
  SEED_LEADS,
  SEED_MATTERS,
  SEED_OPPORTUNITIES,
  SEED_TASKS,
} from "./seed.js";

const stats = computeCrmStats({
  leads: SEED_LEADS,
  accounts: SEED_ACCOUNTS,
  opportunities: SEED_OPPORTUNITIES,
  matters: SEED_MATTERS,
  tasks: SEED_TASKS,
});

describe("resolveCopilotQuery", () => {
  it("responde prompt de riscos com dados do CRM", () => {
    const response = resolveCopilotQuery(
      { query: "Quais riscos exigem ação hoje?" },
      stats,
    );
    expect(response.simulated).toBe(true);
    expect(response.synthesis).toMatch(/atenção concentrada/i);
    expect(response.sources.length).toBeGreaterThan(0);
    expect(response.relatedEntities.length).toBeGreaterThan(0);
  });

  it("responde prompt de documentos de regularização", () => {
    const response = resolveCopilotQuery(
      { query: "Que documentos pedir para regularização rural?" },
      stats,
    );
    expect(response.promptId).toBe("rural-docs");
    expect(response.sources.some((s) => s.documentId === "KB-005")).toBe(true);
  });
});