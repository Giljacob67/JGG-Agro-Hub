import { describe, it, expect } from "vitest";
import {
  AiAssistResponseSchema,
  buildAssistSystemPrompt,
  buildAssistUserMessage,
} from "./assist.js";

describe("buildAssistSystemPrompt", () => {
  it("inclui o brief específico da tarefa e as regras compartilhadas", () => {
    const p = buildAssistSystemPrompt("summarize_matter");
    expect(p).toContain("RESUMO EXECUTIVO");
    expect(p).toContain("português brasileiro");
    expect(p).toContain("title, content, bullets");
  });

  it("varia o brief por tarefa", () => {
    expect(buildAssistSystemPrompt("enrich_lead")).toContain("ENRIQUECER");
    expect(buildAssistSystemPrompt("next_steps")).toContain("PRÓXIMOS PASSOS");
    expect(buildAssistSystemPrompt("draft_notes")).toContain("RASCUNHO DE NOTAS");
  });
});

describe("buildAssistUserMessage", () => {
  it("serializa o registro ignorando campos de ruído e vazios", () => {
    const msg = buildAssistUserMessage("matter", {
      title: "Ação de despejo",
      status: "ativo",
      deletedAt: "2026-01-01",
      createdAt: "2026-01-01",
      empty: "",
      tags: [],
      parties: ["João", "Maria"],
    });
    expect(msg).toContain("Registro (matter)");
    expect(msg).toContain("- title: Ação de despejo");
    expect(msg).toContain("- parties: João; Maria");
    expect(msg).not.toContain("deletedAt");
    expect(msg).not.toContain("createdAt");
    expect(msg).not.toContain("empty");
    expect(msg).not.toContain("tags");
  });

  it("usa fallback quando não há entidade estruturada", () => {
    const msg = buildAssistUserMessage("opportunity", null);
    expect(msg).toContain("sem dados estruturados");
  });

  it("anexa contexto adicional do usuário quando presente", () => {
    const msg = buildAssistUserMessage("lead", { name: "Fazenda X" }, "ligar amanhã");
    expect(msg).toContain("Contexto adicional do usuário");
    expect(msg).toContain("ligar amanhã");
  });

  it("ignora contexto em branco", () => {
    const msg = buildAssistUserMessage("lead", { name: "Fazenda X" }, "   ");
    expect(msg).not.toContain("Contexto adicional");
  });
});

describe("AiAssistResponseSchema", () => {
  it("valida resposta bem formada", () => {
    const r = AiAssistResponseSchema.safeParse({
      title: "Resumo",
      content: "Texto.",
      bullets: ["a", "b"],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita mais de 8 bullets", () => {
    const r = AiAssistResponseSchema.safeParse({
      title: "x",
      content: "y",
      bullets: Array.from({ length: 9 }, (_, i) => String(i)),
    });
    expect(r.success).toBe(false);
  });
});
