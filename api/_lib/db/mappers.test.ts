import { describe, expect, it } from "vitest";
import {
  mapAccount,
  mapLead,
  mapMatter,
  mapOpportunity,
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
});