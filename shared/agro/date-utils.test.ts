import { describe, expect, it } from "vitest";
import {
  isCriticalDeadline,
  isOverdue,
  isTaskOverdue,
  isWithinDays,
} from "./date-utils.js";

describe("date-utils (fuso São Paulo)", () => {
  describe("isOverdue", () => {
    it("considera vencido um prazo antes de hoje", () => {
      const now = new Date("2026-07-15T12:00:00Z"); // meio-dia UTC = meio-dia SP-3h... 09:00 SP
      expect(isOverdue("2026-07-14", now)).toBe(true);
    });

    it("não considera vencido o próprio dia", () => {
      const now = new Date("2026-07-15T12:00:00Z");
      expect(isOverdue("2026-07-15", now)).toBe(false);
    });

    it("não considera vencido um prazo futuro", () => {
      const now = new Date("2026-07-15T12:00:00Z");
      expect(isOverdue("2026-07-16", now)).toBe(false);
    });

    it("usa o dia corrente em São Paulo, não em UTC — regressão do bug de fuso", () => {
      // 2026-07-15 23:30 em São Paulo (UTC-3) = 2026-07-16 02:30 UTC.
      // Um servidor rodando em UTC (padrão Vercel) veria "16", mas o dia
      // real para o usuário/negócio em São Paulo ainda é "15".
      const lateNightInSaoPaulo = new Date("2026-07-16T02:30:00Z");
      // Um prazo com vencimento HOJE (15) em São Paulo não pode aparecer
      // como vencido só porque o relógio do processo já virou o dia em UTC.
      expect(isOverdue("2026-07-15", lateNightInSaoPaulo)).toBe(false);
      // E um prazo de amanhã (16) segue não vencido.
      expect(isOverdue("2026-07-16", lateNightInSaoPaulo)).toBe(false);
    });
  });

  describe("isWithinDays", () => {
    const now = new Date("2026-07-15T12:00:00Z");

    it("inclui o próprio dia e o limite superior", () => {
      expect(isWithinDays("2026-07-15", 3, now)).toBe(true);
      expect(isWithinDays("2026-07-18", 3, now)).toBe(true);
    });

    it("exclui datas fora da janela", () => {
      expect(isWithinDays("2026-07-19", 3, now)).toBe(false);
      expect(isWithinDays("2026-07-14", 3, now)).toBe(false);
    });
  });

  describe("isCriticalDeadline", () => {
    const now = new Date("2026-07-15T12:00:00Z");

    it("nunca é crítico se a demanda está concluída", () => {
      expect(isCriticalDeadline("2026-07-10", "critico", "concluida", now)).toBe(
        false,
      );
    });

    it("é crítico se já venceu, independente do risco", () => {
      expect(isCriticalDeadline("2026-07-10", "baixo", "aberta", now)).toBe(true);
    });

    it("é crítico com risco alto/crítico dentro de 3 dias", () => {
      expect(isCriticalDeadline("2026-07-17", "alto", "aberta", now)).toBe(true);
      expect(isCriticalDeadline("2026-07-20", "critico", "aberta", now)).toBe(
        false,
      );
    });

    it("não é crítico com risco baixo mesmo perto do vencimento", () => {
      expect(isCriticalDeadline("2026-07-16", "baixo", "aberta", now)).toBe(
        false,
      );
    });
  });

  describe("isTaskOverdue", () => {
    const now = new Date("2026-07-15T12:00:00Z");

    it("tarefa concluída nunca está vencida", () => {
      expect(
        isTaskOverdue({ dueDate: "2026-07-01", status: "concluida" }, now),
      ).toBe(false);
    });

    it("status 'atrasada' é sempre vencida", () => {
      expect(
        isTaskOverdue({ dueDate: "2026-07-20", status: "atrasada" }, now),
      ).toBe(true);
    });

    it("data no passado com status pendente é vencida", () => {
      expect(
        isTaskOverdue({ dueDate: "2026-07-10", status: "pendente" }, now),
      ).toBe(true);
    });
  });
});
