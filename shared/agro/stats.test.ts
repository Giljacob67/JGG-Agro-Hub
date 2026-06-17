import { describe, expect, it } from "vitest";
import { computeCrmStats } from "./stats.js";
import { resetStore, listLeads, patchLead } from "./store.js";

describe("computeCrmStats", () => {
  it("retorna KPIs coerentes com o seed", () => {
    resetStore();
    const stats = computeCrmStats();
    expect(stats.activeLeads).toBeGreaterThan(0);
    expect(stats.openOpportunities).toBeGreaterThan(0);
    expect(stats.pipelineValue).toBeGreaterThan(0);
    expect(stats.pipelineByStage.length).toBe(7);
    expect(stats.priorityOpportunities.length).toBeLessThanOrEqual(5);
    expect(stats.activeAccounts).toBeGreaterThan(0);
    expect(stats.practiceBreakdown.length).toBeGreaterThan(0);
    expect(stats.portfolioByRegion.length).toBeGreaterThan(0);
  });

  it("exclui lead soft-deletado de activeLeads e upcomingContacts", () => {
    resetStore();
    const before = computeCrmStats();
    const lead = listLeads()[0];
    expect(lead).toBeDefined();
    patchLead(lead.id, { deletedAt: new Date().toISOString() });

    const after = computeCrmStats();
    expect(after.activeLeads).toBeLessThan(before.activeLeads);
    expect(after.upcomingContacts.find((c) => c.id === lead.id)).toBeUndefined();
  });
});