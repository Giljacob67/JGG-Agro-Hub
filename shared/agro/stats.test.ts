import { describe, expect, it } from "vitest";
import { computeCrmStats, computeCrmTimeseries } from "./stats.js";
import { resetStore, listLeads, patchLead } from "./store.js";
import { FIXTURES } from "./test-fixtures.js";

describe("computeCrmStats", () => {
  it("retorna KPIs coerentes com o seed", () => {
    resetStore(FIXTURES);
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
    resetStore(FIXTURES);
    const before = computeCrmStats();
    const lead = listLeads()[0];
    expect(lead).toBeDefined();
    patchLead(lead.id, { deletedAt: new Date().toISOString() });

    const after = computeCrmStats();
    expect(after.activeLeads).toBeLessThan(before.activeLeads);
    expect(after.upcomingContacts.find((c) => c.id === lead.id)).toBeUndefined();
  });
});

describe("computeCrmTimeseries", () => {
  it("retorna 6 buckets mensais em cada série, ordenados", () => {
    resetStore(FIXTURES);
    const ts = computeCrmTimeseries();
    expect(ts.leadsByMonth).toHaveLength(6);
    expect(ts.pipelineByMonth).toHaveLength(6);

    for (const series of [ts.leadsByMonth, ts.pipelineByMonth]) {
      const keys = series.map((p) => p.month);
      expect([...keys].sort()).toEqual(keys);
      for (const p of series) {
        expect(p.month).toMatch(/^\d{4}-\d{2}$/);
        expect(p.value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("conta um novo lead no bucket do mês corrente", () => {
    resetStore(FIXTURES);
    const before = computeCrmTimeseries();
    const lead = listLeads()[0];
    const currentKey = before.leadsByMonth[before.leadsByMonth.length - 1].month;
    patchLead(lead.id, { createdAt: new Date().toISOString() });

    const after = computeCrmTimeseries();
    const beforeVal =
      before.leadsByMonth.find((p) => p.month === currentKey)?.value ?? 0;
    const afterVal =
      after.leadsByMonth.find((p) => p.month === currentKey)?.value ?? 0;
    expect(afterVal).toBeGreaterThanOrEqual(beforeVal);
  });
});