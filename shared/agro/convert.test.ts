import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildOpportunityFromLead,
  conversionBlockReason,
} from "./convert.js";
import {
  addDeadline,
  getLead,
  listDeadlines,
  nextDeadlineId,
  patchDeadline,
  resetStore,
} from "./store.js";
import { FIXTURES } from "./test-fixtures.js";

beforeEach(() => resetStore(FIXTURES));
afterEach(() => resetStore());

describe("conversão lead → oportunidade", () => {
  it("monta oportunidade herdando conta, responsável e prioridade do lead", () => {
    const lead = getLead("LD-003")!;
    const opp = buildOpportunityFromLead(lead, "OP-900", { valueBrl: 50_000 });
    expect(opp.id).toBe("OP-900");
    expect(opp.leadId).toBe("LD-003");
    expect(opp.stage).toBe("novo_contato");
    expect(opp.valueBrl).toBe(50_000);
    expect(opp.owner).toBe(lead.owner);
  });

  it("bloqueia conversão de lead já convertido ou descartado", () => {
    expect(conversionBlockReason(getLead("LD-001"))).toBe("already_converted");
    expect(conversionBlockReason(undefined)).toBe("not_found");
    expect(conversionBlockReason(getLead("LD-003"))).toBeNull();
  });
});

describe("prazos processuais", () => {
  it("lista prazos por demanda", () => {
    const deadlines = listDeadlines("MT-307");
    expect(deadlines.length).toBeGreaterThanOrEqual(3);
    expect(deadlines.every((d) => d.matterId === "MT-307")).toBe(true);
    expect(deadlines.some((d) => d.type === "fatal")).toBe(true);
  });

  it("cria e cumpre prazo", () => {
    const id = nextDeadlineId();
    addDeadline({
      id,
      matterId: "MT-301",
      title: "Prazo de teste",
      type: "ordinatorio",
      status: "pendente",
      dueDate: "2026-07-01",
      owner: "Ana Ribeiro",
      completedAt: null,
    });
    const done = patchDeadline(id, {
      status: "cumprido",
      completedAt: "2026-06-12",
    });
    expect(done?.status).toBe("cumprido");
    expect(done?.completedAt).toBe("2026-06-12");
  });
});
