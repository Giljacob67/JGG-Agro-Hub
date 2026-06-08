import { describe, expect, it } from "vitest";
import { filterLeads, filterOpportunities } from "./filters.js";
import { SEED_LEADS, SEED_OPPORTUNITIES } from "./seed.js";

describe("crm filters", () => {
  it("filtra leads por região e status", () => {
    const result = filterLeads(SEED_LEADS, {
      region: "MT — Sorriso",
      status: "qualificado",
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((l) => l.region === "MT — Sorriso")).toBe(true);
  });

  it("filtra oportunidades por faixa de valor", () => {
    const result = filterOpportunities(SEED_OPPORTUNITIES, {
      valueRange: "acima_200k",
    });
    expect(result.every((o) => o.valueBrl >= 200_000)).toBe(true);
  });
});