import { describe, it, expect } from "vitest";
import {
  addBusinessDays,
  countBusinessDays,
  calculateDeadline,
  isBusinessDayCheck,
  nextBusinessDay,
  PROCEDURAL_DEADLINES,
} from "./deadline-calculator";

describe("Deadline Calculator", () => {
  describe("addBusinessDays", () => {
    it("should add business days excluding weekends", () => {
      // Monday 2026-06-15 + 5 business days = Monday 2026-06-22
      const start = new Date(2026, 5, 15); // June 15, 2026 (Monday)
      const result = addBusinessDays(start, 5);
      expect(result.toISOString().slice(0, 10)).toBe("2026-06-22");
    });

    it("should skip weekends", () => {
      // Friday 2026-06-19 + 1 business day = Monday 2026-06-22
      const start = new Date(2026, 5, 19); // Friday
      const result = addBusinessDays(start, 1);
      expect(result.toISOString().slice(0, 10)).toBe("2026-06-22");
    });

    it("should handle zero business days", () => {
      const start = new Date(2026, 5, 15);
      const result = addBusinessDays(start, 0);
      expect(result.toISOString().slice(0, 10)).toBe("2026-06-15");
    });
  });

  describe("countBusinessDays", () => {
    it("should count business days between two dates", () => {
      const start = new Date(2026, 5, 15); // Monday
      const end = new Date(2026, 5, 22); // Monday
      expect(countBusinessDays(start, end)).toBe(5);
    });

    it("should count zero for same day", () => {
      const date = new Date(2026, 5, 15);
      expect(countBusinessDays(date, date)).toBe(0);
    });
  });

  describe("calculateDeadline", () => {
    it("should calculate contestação deadline (15 business days)", () => {
      const start = new Date(2026, 5, 15); // Monday
      const result = calculateDeadline(start, "contestacao");
      expect(result.businessDays).toBe(15);
      expect(result.type).toBe("contestacao");
      expect(result.label).toBe("Contestação");
      expect(result.dueDate).toBeDefined();
    });

    it("should calculate custom deadline", () => {
      const start = new Date(2026, 5, 15);
      const result = calculateDeadline(start, "custom", 10);
      expect(result.businessDays).toBe(10);
    });

    it("should calculate days remaining from today", () => {
      const start = new Date();
      const result = calculateDeadline(start, "contestacao");
      expect(result.daysRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe("isBusinessDayCheck", () => {
    it("should return true for weekdays", () => {
      const monday = new Date(2026, 5, 15); // Monday
      expect(isBusinessDayCheck(monday)).toBe(true);
    });

    it("should return false for weekends", () => {
      const saturday = new Date(2026, 5, 20); // Saturday
      expect(isBusinessDayCheck(saturday)).toBe(false);
    });
  });

  describe("nextBusinessDay", () => {
    it("should return same day if already business day", () => {
      const monday = new Date(2026, 5, 15);
      const result = nextBusinessDay(monday);
      expect(result.toISOString().slice(0, 10)).toBe("2026-06-15");
    });

    it("should skip to Monday if on weekend", () => {
      const saturday = new Date(2026, 5, 20);
      const result = nextBusinessDay(saturday);
      expect(result.toISOString().slice(0, 10)).toBe("2026-06-22");
    });
  });

  describe("feriados móveis (derivados da Páscoa)", () => {
    it("Sexta-feira Santa 2026 (03/04) não é dia útil", () => {
      expect(isBusinessDayCheck(new Date(2026, 3, 3))).toBe(false);
    });

    it("Corpus Christi 2026 (04/06) não é dia útil", () => {
      expect(isBusinessDayCheck(new Date(2026, 5, 4))).toBe(false);
    });

    it("Carnaval (terça) 2026 (17/02) não é dia útil", () => {
      expect(isBusinessDayCheck(new Date(2026, 1, 17))).toBe(false);
    });

    it("feriados computados para anos fora da lista antiga (2030)", () => {
      // Natal 2030 cai numa quarta — deve ser feriado mesmo sem hardcode.
      expect(isBusinessDayCheck(new Date(2030, 11, 25))).toBe(false);
    });
  });

  describe("recesso forense (CPC art. 220, 20/12–20/01)", () => {
    it("05/01 está em recesso — não é dia útil", () => {
      expect(isBusinessDayCheck(new Date(2027, 0, 5))).toBe(false);
    });

    it("22/12 está em recesso — não é dia útil", () => {
      expect(isBusinessDayCheck(new Date(2027, 11, 22))).toBe(false);
    });

    it("21/01 já fora do recesso", () => {
      // 21/01/2027 é quinta — fora do recesso e dia útil.
      expect(isBusinessDayCheck(new Date(2027, 0, 21))).toBe(true);
    });
  });

  describe("customDays === 0", () => {
    it("respeita 0 dias úteis em vez de cair no default", () => {
      const start = new Date(2026, 5, 15);
      const result = calculateDeadline(start, "custom", 0);
      expect(result.businessDays).toBe(0);
      expect(result.dueDate).toBe("2026-06-15");
    });
  });

  describe("PROCEDURAL_DEADLINES", () => {
    it("should have all deadline types", () => {
      expect(PROCEDURAL_DEADLINES.contestacao).toBeDefined();
      expect(PROCEDURAL_DEADLINES.recurso_apelacao).toBeDefined();
      expect(PROCEDURAL_DEADLINES.recurso_agravo).toBeDefined();
      expect(PROCEDURAL_DEADLINES.custom).toBeDefined();
    });

    it("should have 15 business days for contestação", () => {
      expect(PROCEDURAL_DEADLINES.contestacao.businessDays).toBe(15);
    });
  });
});
