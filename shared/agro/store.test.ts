import { describe, it, expect, beforeEach } from "vitest";
import {
  listLeads,
  getLead,
  addLead,
  listAccounts,
  getAccount,
  addAccount,
  listMatters,
  getMatter,
  addMatter,
  listCropSeasons,
  getCropSeason,
  addCropSeason,
  listTaxObligations,
  addTaxObligation,
  listEnvironmentalLicenses,
  addEnvironmentalLicense,
  listCreditInstruments,
  addCreditInstrument,
  resetStore,
} from "./store";

describe("Store", () => {
  beforeEach(() => {
    resetStore();
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

  describe("CropSeasons", () => {
    it("should list seeded crop seasons", () => {
      const seasons = listCropSeasons();
      expect(seasons.length).toBeGreaterThan(0);
    });

    it("should get crop season by id", () => {
      const season = getCropSeason("CS-001");
      expect(season).toBeDefined();
      expect(season?.mainCrop).toBe("Soja");
    });

    it("should add a new crop season", () => {
      const newSeason = {
        id: "CS-TEST",
        name: "Test Season",
        year: 2026,
        plantingStart: "2026-09-01",
        plantingEnd: "2026-10-01",
        harvestStart: "2027-01-01",
        harvestEnd: "2027-03-01",
        mainCrop: "Milho",
        createdAt: "2026-01-01",
      };
      addCropSeason(newSeason);
      expect(getCropSeason("CS-TEST")).toBeDefined();
    });

    it("should filter by year", () => {
      const seasons2026 = listCropSeasons({ year: 2026 });
      expect(seasons2026.length).toBeGreaterThan(0);
      seasons2026.forEach((s) => expect(s.year).toBe(2026));
    });
  });

  describe("TaxObligations", () => {
    it("should list seeded tax obligations", () => {
      const taxes = listTaxObligations();
      expect(taxes.length).toBeGreaterThan(0);
    });

    it("should add a new tax obligation", () => {
      const newTax = {
        id: "TAX-TEST",
        propertyId: "PROP-TEST",
        accountId: "AC-TEST",
        type: "itr" as const,
        year: 2026,
        valueBrl: 10000,
        dueDate: "2026-09-30",
        status: "pendente" as const,
        createdAt: "2026-01-01",
      };
      addTaxObligation(newTax);
      const taxes = listTaxObligations({ year: 2026 });
      expect(taxes.find((t) => t.id === "TAX-TEST")).toBeDefined();
    });
  });

  describe("EnvironmentalLicenses", () => {
    it("should list seeded licenses", () => {
      const licenses = listEnvironmentalLicenses();
      expect(licenses.length).toBeGreaterThan(0);
    });

    it("should add a new license", () => {
      const newLicense = {
        id: "LIC-TEST",
        propertyId: "PROP-TEST",
        accountId: "AC-TEST",
        type: "LP",
        number: "LP-TEST-001",
        issuer: "IBAMA",
        issuedAt: "2026-01-01",
        expiresAt: "2029-01-01",
        status: "vigente" as const,
        createdAt: "2026-01-01",
      };
      addEnvironmentalLicense(newLicense);
      const licenses = listEnvironmentalLicenses();
      expect(licenses.find((l) => l.id === "LIC-TEST")).toBeDefined();
    });
  });

  describe("CreditInstruments", () => {
    it("should list seeded credit instruments", () => {
      const instruments = listCreditInstruments();
      expect(instruments.length).toBeGreaterThan(0);
    });

    it("should add a new instrument", () => {
      const newInstrument = {
        id: "CR-TEST",
        accountId: "AC-TEST",
        type: "cpr" as const,
        number: "CPR-TEST-001",
        valueBrl: 1000000,
        issueDate: "2026-01-01",
        maturityDate: "2027-01-01",
        status: "ativo" as const,
        createdAt: "2026-01-01",
      };
      addCreditInstrument(newInstrument);
      const instruments = listCreditInstruments();
      expect(instruments.find((i) => i.id === "CR-TEST")).toBeDefined();
    });
  });
});
