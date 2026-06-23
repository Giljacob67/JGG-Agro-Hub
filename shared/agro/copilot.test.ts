import { describe, expect, it } from "vitest";
import { resolveCopilotQuery } from "./copilot.js";
import { computeCrmStats } from "./stats.js";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_LEADS,
  FIXTURE_MATTERS,
  FIXTURE_OPPORTUNITIES,
  FIXTURE_TASKS,
} from "./test-fixtures.js";

const stats = computeCrmStats({
  leads: FIXTURE_LEADS,
  accounts: FIXTURE_ACCOUNTS,
  opportunities: FIXTURE_OPPORTUNITIES,
  matters: FIXTURE_MATTERS,
  tasks: FIXTURE_TASKS,
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