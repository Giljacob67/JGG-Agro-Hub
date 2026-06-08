import { describe, expect, it } from "vitest";
import { computeCrmStats } from "./stats.js";
import { resetStore } from "./store.js";

describe("computeCrmStats", () => {
  it("retorna KPIs coerentes com o seed", () => {
    resetStore();
    const stats = computeCrmStats();
    expect(stats.activeLeads).toBeGreaterThan(0);
    expect(stats.openOpportunities).toBeGreaterThan(0);
    expect(stats.pipelineValue).toBeGreaterThan(0);
    expect(stats.pipelineByStage.length).toBe(4);
    expect(stats.priorityOpportunities.length).toBeLessThanOrEqual(5);
  });
});