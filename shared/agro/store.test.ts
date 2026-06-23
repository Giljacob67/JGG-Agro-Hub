import { describe, it, expect, beforeEach } from "vitest";
import {
  listLeads,
  getLead,
  addLead,
  patchLead,
  listAccounts,
  getAccount,
  addAccount,
  patchAccount,
  listOpportunities,
  getOpportunity,
  addOpportunity,
  patchOpportunity,
  listMatters,
  getMatter,
  addMatter,
  patchMatter,
  listMattersByOpportunity,
  listTasks,
  getTask,
  addTask,
  patchTask,
  getRelatedTasks,
  getAccountTimeline,
  resetStore,
} from "./store";
import { FIXTURES } from "./test-fixtures.js";

describe("Store", () => {
  beforeEach(() => {
    resetStore(FIXTURES);
  });

  describe("Leads", () => {
    it("should list seeded leads", () => {
      const leads = listLeads();
      expect(leads.length).toBeGreaterThan(0);
    });

    it("should get lead by id", () => {
      const lead = getLead("LD-001");
      expect(lead).toBeDefined();
      expect(lead?.name).toContain("Fazenda");
    });

    it("should add a new lead", () => {
      const newLead = {
        id: "LD-TEST",
        name: "Test Lead",
        contact: "test@example.com",
        region: "SP",
        crop: "Soja",
        source: "Test",
        status: "novo" as const,
        owner: "Test User",
        createdAt: "2026-01-01",
        nextContact: "2026-02-01",
        notes: "Test notes",
      };
      addLead(newLead);
      expect(getLead("LD-TEST")).toBeDefined();
    });
  });

  describe("Accounts", () => {
    it("should list seeded accounts", () => {
      const accounts = listAccounts();
      expect(accounts.length).toBeGreaterThan(0);
    });

    it("should get account by id", () => {
      const account = getAccount("AC-101");
      expect(account).toBeDefined();
    });
  });

  describe("Matters", () => {
    it("should list seeded matters", () => {
      const matters = listMatters();
      expect(matters.length).toBeGreaterThan(0);
    });

    it("should get matter by id", () => {
      const matter = getMatter("MT-301");
      expect(matter).toBeDefined();
    });
  });

  describe("Soft-delete (CRM core)", () => {
    const iso = () => new Date().toISOString();

    it("oculta lead deletado de lista/get/timeline", () => {
      const before = listLeads();
      const lead = before[0];
      expect(lead).toBeDefined();
      patchLead(lead.id, { deletedAt: iso() });
      expect(getLead(lead.id)).toBeUndefined();
      expect(listLeads().find((l) => l.id === lead.id)).toBeUndefined();
    });

    it("oculta account deletado de lista/get/timeline", () => {
      const before = listAccounts();
      const account = before[0];
      patchAccount(account.id, { deletedAt: iso() });
      expect(getAccount(account.id)).toBeUndefined();
      expect(listAccounts().find((a) => a.id === account.id)).toBeUndefined();
    });

    it("oculta oportunidade deletada de lista/get", () => {
      const before = listOpportunities();
      const opp = before[0];
      patchOpportunity(opp.id, { deletedAt: iso() });
      expect(getOpportunity(opp.id)).toBeUndefined();
      expect(listOpportunities().find((o) => o.id === opp.id)).toBeUndefined();
    });

    it("oculta demanda deletada de lista/get/mattersByOpportunity", () => {
      const before = listMatters();
      const matter = before[0];
      const oppId = matter.opportunityId;
      patchMatter(matter.id, { deletedAt: iso() });
      expect(getMatter(matter.id)).toBeUndefined();
      expect(listMatters().find((m) => m.id === matter.id)).toBeUndefined();
      if (oppId) {
        expect(listMattersByOpportunity(oppId).find((m) => m.id === matter.id)).toBeUndefined();
      }
    });

    it("oculta tarefa deletada de lista/get/relatedTasks/timeline", () => {
      const task = {
        id: "TK-DEL",
        title: "Tarefa a deletar",
        relatedTo: "MT-301",
        type: "operacional" as const,
        priority: "media" as const,
        status: "pendente" as const,
        dueDate: "2026-12-01",
        owner: "Tester",
      };
      addTask(task);
      expect(getTask("TK-DEL")).toBeDefined();
      patchTask("TK-DEL", { deletedAt: iso() });
      expect(getTask("TK-DEL")).toBeUndefined();
      expect(listTasks().find((t) => t.id === "TK-DEL")).toBeUndefined();
      expect(getRelatedTasks("MT-301").find((t) => t.id === "TK-DEL")).toBeUndefined();
    });

    it("getAccountTimeline exclui deletados de leads/oportunidades/demandas/tarefas", () => {
      const account = listAccounts()[0];
      const timelineBefore = getAccountTimeline(account.id);
      const leadDel = timelineBefore.leads[0];
      if (leadDel) patchLead(leadDel.id, { deletedAt: iso() });
      const timelineAfter = getAccountTimeline(account.id);
      if (leadDel) {
        expect(timelineAfter.leads.find((l) => l.id === leadDel.id)).toBeUndefined();
      }
    });
  });
});
