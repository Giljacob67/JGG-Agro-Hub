import { describe, expect, it } from "vitest";
import {
  mapAccount,
  mapContact,
  mapCreditInstrument,
  mapCropSeason,
  mapDocument,
  mapDocumentChecklistItem,
  mapEnvironmentalLicense,
  mapFeeAgreement,
  mapInvoice,
  mapLead,
  mapMatter,
  mapOpportunity,
  mapOpposingParty,
  mapProperty,
  mapTask,
  mapTaxObligation,
  mapTimeEntry,
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

  it("mapDocument parseia versions (JSONB objeto) e tags", () => {
    const doc = mapDocument({
      id: "DOC-1",
      name: "Contrato",
      category: "contrato",
      status: "recebido",
      entity_type: "matter",
      entity_id: "MT-1",
      version: 2,
      versions: [
        { version: 1, fileName: "v1.pdf", uploadedBy: "Ana", uploadedAt: "2026-06-01T00:00:00.000Z" },
        { version: 2, fileName: "v2.pdf", uploadedBy: "Ana", uploadedAt: "2026-06-02T00:00:00.000Z" },
      ],
      tags: '["urgente","revisar"]',
      owner: "Ana",
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-02T00:00:00.000Z",
      matter_id: "MT-1",
    });
    expect(doc.version).toBe(2);
    expect(doc.versions).toHaveLength(2);
    expect(doc.versions[1].fileName).toBe("v2.pdf");
    expect(doc.tags).toEqual(["urgente", "revisar"]);
    expect(doc.matterId).toBe("MT-1");
  });

  it("mapContact parseia accountIds e is_primary", () => {
    const contact = mapContact({
      id: "CT-1",
      name: "João",
      role: "proprietario",
      is_primary: true,
      account_ids: '["AC-1","AC-2"]',
      owner: "Ana",
      created_at: "2026-06-01T00:00:00.000Z",
      email: "joao@demo.br",
    });
    expect(contact.isPrimary).toBe(true);
    expect(contact.accountIds).toEqual(["AC-1", "AC-2"]);
    expect(contact.email).toBe("joao@demo.br");
  });

  it("mapProperty mapeia gps→GPS e arrays", () => {
    const property = mapProperty({
      id: "PR-1",
      name: "Fazenda Boa Vista",
      type: "propriedade",
      account_id: "AC-1",
      area_ha: "1500.50",
      gps: "-15.0,-47.0",
      encumbrances: ["hipoteca"],
      restrictions: '["reserva legal"]',
      owner: "Ana",
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(property.areaHa).toBe(1500.5);
    expect(property.GPS).toBe("-15.0,-47.0");
    expect(property.encumbrances).toEqual(["hipoteca"]);
    expect(property.restrictions).toEqual(["reserva legal"]);
  });

  it("mapInvoice mapeia datas e timeEntryIds", () => {
    const invoice = mapInvoice({
      id: "INV-1",
      account_id: "AC-1",
      number: "2026/001",
      status: "emitida",
      total_brl: "12500.00",
      issued_at: "2026-06-01",
      due_at: "2026-07-01",
      time_entry_ids: '["TE-1","TE-2"]',
      created_at: "2026-06-01T00:00:00.000Z",
      matter_id: "MT-1",
    });
    expect(invoice.totalBrl).toBe(12500);
    expect(invoice.issuedAt).toBe("2026-06-01");
    expect(invoice.dueAt).toBe("2026-07-01");
    expect(invoice.timeEntryIds).toEqual(["TE-1", "TE-2"]);
    expect(invoice.matterId).toBe("MT-1");
  });

  it("mapDocumentChecklistItem mapeia required/documentId/notes", () => {
    const item = mapDocumentChecklistItem({
      id: "DC-1",
      matter_id: "MT-1",
      label: "CAR",
      category: "ambiental",
      required: true,
      status: "pendente",
      document_id: null,
      notes: "urgente",
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(item.required).toBe(true);
    expect(item.documentId).toBeNull();
    expect(item.notes).toBe("urgente");
  });

  it("mapTimeEntry converte numéricos e date, mapeia deleted_at", () => {
    const entry = mapTimeEntry({
      id: "TE-1",
      matter_id: "MT-1",
      description: "Audiência",
      hours: "2.50",
      hourly_rate: "400.00",
      total_brl: "1000.00",
      type: "horas",
      date: "2026-06-10",
      owner: "Ana",
      billable: true,
      invoiced: false,
      task_id: "TK-9",
      created_at: "2026-06-10T00:00:00.000Z",
      deleted_at: new Date("2026-01-02T03:04:05.000Z"),
    });
    expect(entry.hours).toBe(2.5);
    expect(entry.totalBrl).toBe(1000);
    expect(entry.date).toBe("2026-06-10");
    expect(entry.taskId).toBe("TK-9");
    expect(entry.deletedAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("mapFeeAgreement gateia expiresAt vazio e campos opcionais", () => {
    const fee = mapFeeAgreement({
      id: "FA-1",
      account_id: "AC-1",
      type: "exito",
      description: "",
      signed_at: "2026-06-01",
      active: true,
      percentage: "12.500",
      expires_at: "",
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(fee.percentage).toBe(12.5);
    expect(fee.signedAt).toBe("2026-06-01");
    expect(fee.expiresAt).toBeUndefined();
  });

  it("mapOpposingParty parseia matters (JSONB)", () => {
    const party = mapOpposingParty({
      id: "OPP-1",
      name: "Fazenda Rival",
      type: "pessoa_juridica",
      matters: '["MT-1","MT-2"]',
      lawyer: "Dr. X",
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(party.matters).toEqual(["MT-1", "MT-2"]);
    expect(party.lawyer).toBe("Dr. X");
  });

  it("mapCropSeason mapeia ano e janelas", () => {
    const season = mapCropSeason({
      id: "CS-1",
      name: "Safra 25/26",
      year: 2026,
      planting_start: "2025-10-01",
      planting_end: "2025-12-15",
      harvest_start: "2026-02-01",
      harvest_end: "2026-04-30",
      main_crop: "soja",
      region: "MT",
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(season.year).toBe(2026);
    expect(season.mainCrop).toBe("soja");
    expect(season.region).toBe("MT");
  });

  it("mapTaxObligation define paidDate null quando vazio", () => {
    const tax = mapTaxObligation({
      id: "TX-1",
      property_id: "PR-1",
      account_id: "AC-1",
      type: "itr",
      year: 2026,
      value_brl: "3500.00",
      due_date: "2026-09-30",
      paid_date: "",
      status: "pendente",
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(tax.valueBrl).toBe(3500);
    expect(tax.dueDate).toBe("2026-09-30");
    expect(tax.paidDate).toBeNull();
  });

  it("mapEnvironmentalLicense parseia conditions (JSONB)", () => {
    const license = mapEnvironmentalLicense({
      id: "EL-1",
      property_id: "PR-1",
      account_id: "AC-1",
      type: "outorga",
      number: "LIC-2026/01",
      issuer: "SEMA",
      issued_at: "2026-01-10",
      expires_at: "2028-01-10",
      status: "vigente",
      conditions: '["monitorar vazão","relatorio anual"]',
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(license.number).toBe("LIC-2026/01");
    expect(license.expiresAt).toBe("2028-01-10");
    expect(license.conditions).toEqual(["monitorar vazão", "relatorio anual"]);
  });

  it("mapCreditInstrument converte taxas e gateia opcionais", () => {
    const credit = mapCreditInstrument({
      id: "CI-1",
      account_id: "AC-1",
      type: "cpr",
      number: "CPR-001",
      value_brl: "250000.00",
      interest_rate: "8.7500",
      iof_rate: "0.3800",
      issue_date: "2026-03-01",
      maturity_date: "2026-12-01",
      installments: 3,
      status: "ativo",
      matter_id: "MT-1",
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(credit.valueBrl).toBe(250000);
    expect(credit.interestRate).toBe(8.75);
    expect(credit.iofRate).toBe(0.38);
    expect(credit.installments).toBe(3);
    expect(credit.matterId).toBe("MT-1");
  });
});