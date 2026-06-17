import { describe, expect, it } from "vitest";
import {
  mapAccount,
  mapLead,
  mapMatter,
  mapOpportunity,
  mapTask,
} from "./mappers.js";

describe("db mappers", () => {
  it("mapLead inclui campos enriquecidos", () => {
    const lead = mapLead({
      id: "LD-001",
      name: "Test",
      region: "MT",
      status: "novo",
      owner: "Ana",
      created_at: "2026-06-01",
      lead_type: "Produtor",
      legal_pain: "CAR",
      interest_area: "Ambiental",
      priority: "alta",
    });

    expect(lead.leadType).toBe("Produtor");
    expect(lead.legalPain).toBe("CAR");
    expect(lead.interestArea).toBe("Ambiental");
    expect(lead.priority).toBe("alta");
  });

  it("mapAccount parseia arrays JSONB", () => {
    const account = mapAccount({
      id: "AC-1",
      name: "Conta",
      type: "produtor",
      region: "GO",
      owner: "Carlos",
      properties: ["Fazenda A"],
      contacts: '["a@demo.br","b@demo.br"]',
      relationship_status: "ativo",
    });

    expect(account.properties).toEqual(["Fazenda A"]);
    expect(account.contacts).toEqual(["a@demo.br", "b@demo.br"]);
    expect(account.relationshipStatus).toBe("ativo");
  });

  it("mapOpportunity normaliza stages legados", () => {
    const legacy = mapOpportunity({
      id: "OP-0",
      title: "Legado qualificacao",
      account_name: "Conta",
      stage: "qualificacao",
      value_brl: 1000,
      owner: "Ana",
      expected_close: "2026-07-01",
    });
    expect(legacy.stage).toBe("diagnostico_agendado");
    const proposta = mapOpportunity({
      id: "OP-1",
      title: "Test",
      account_name: "Conta",
      stage: "proposta",
      value_brl: 1000,
      owner: "Ana",
      expected_close: "2026-07-01",
      probability: 50,
      next_step: "Enviar minuta",
    });

    expect(proposta.stage).toBe("proposta_elaboracao");
    expect(proposta.probability).toBe(50);
    expect(proposta.nextStep).toBe("Enviar minuta");
  });

  it("mapMatter inclui urgência e documentos pendentes", () => {
    const matter = mapMatter({
      id: "MT-1",
      title: "Demanda",
      account_name: "Conta",
      practice: "Ambiental",
      status: "aberta",
      risk: "alto",
      deadline: "2026-06-10",
      owner: "Ana",
      urgency: "critica",
      next_steps: "Protocolar",
      pending_documents: ["Laudo"],
    });

    expect(matter.urgency).toBe("critica");
    expect(matter.nextSteps).toBe("Protocolar");
    expect(matter.pendingDocuments).toEqual(["Laudo"]);
  });

  it("mapLead mapeia deleted_at (Date) para deletedAt ISO", () => {
    const date = new Date("2026-01-02T03:04:05.000Z");
    const lead = mapLead({
      id: "LD-002",
      name: "Test",
      region: "MT",
      status: "novo",
      owner: "Ana",
      created_at: "2026-06-01",
      deleted_at: date,
    });
    expect(lead.deletedAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("mapLead deixa deletedAt undefined quando deleted_at ausente", () => {
    const lead = mapLead({
      id: "LD-003",
      name: "Test",
      region: "MT",
      status: "novo",
      owner: "Ana",
      created_at: "2026-06-01",
    });
    expect(lead.deletedAt).toBeUndefined();
  });

  it("mapTask mapeia deleted_at (Date) para deletedAt ISO", () => {
    const date = new Date("2026-01-02T03:04:05.000Z");
    const task = mapTask({
      id: "TK-1",
      title: "Tarefa",
      related_to: "MT-1",
      type: "operacional",
      priority: "media",
      status: "pendente",
      due_date: "2026-12-01",
      owner: "Ana",
      deleted_at: date,
    });
    expect(task.deletedAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("mapTask deixa deletedAt undefined quando deleted_at ausente", () => {
    const task = mapTask({
      id: "TK-2",
      title: "Tarefa",
      related_to: "MT-1",
      type: "operacional",
      priority: "media",
      status: "pendente",
      due_date: "2026-12-01",
      owner: "Ana",
    });
    expect(task.deletedAt).toBeUndefined();
  });
});