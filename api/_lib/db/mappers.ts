import type {
  Account,
  Activity,
  Contact,
  CreditInstrument,
  CropSeason,
  Deadline,
  Document,
  DocumentChecklistItem,
  DocumentVersion,
  EnvironmentalLicense,
  FeeAgreement,
  Invoice,
  Lead,
  Matter,
  Opportunity,
  OpposingParty,
  Property,
  Task,
  TaxObligation,
  TimeEntry,
} from "../../../shared/agro/types.js";
import { parseJsonValue, parseStringArray } from "./json-utils.js";

function toDateStr(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toIso(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapLegacyOpportunityStage(stage: unknown): Opportunity["stage"] {
  const value = String(stage);
  if (value === "proposta") return "proposta_elaboracao";
  if (value === "qualificacao") return "diagnostico_agendado";
  return value as Opportunity["stage"];
}

export function mapLead(row: Record<string, unknown>): Lead {
  const lead: Lead = {
    id: String(row.id),
    name: String(row.name),
    contact: String(row.contact ?? ""),
    region: String(row.region),
    crop: String(row.crop ?? ""),
    source: String(row.source ?? ""),
    status: row.status as Lead["status"],
    owner: String(row.owner),
    createdAt: toDateStr(row.created_at),
    nextContact: row.next_contact ? toDateStr(row.next_contact) : null,
    notes: String(row.notes ?? ""),
    accountId: row.account_id ? String(row.account_id) : null,
  };

  if (row.lead_type) lead.leadType = String(row.lead_type);
  if (row.legal_pain) lead.legalPain = String(row.legal_pain);
  if (row.interest_area) lead.interestArea = String(row.interest_area);
  if (row.priority) lead.priority = row.priority as Lead["priority"];
  if (row.converted_opportunity_id) {
    lead.convertedOpportunityId = String(row.converted_opportunity_id);
  }
  if (row.deleted_at) {
    lead.deletedAt = row.deleted_at instanceof Date
      ? row.deleted_at.toISOString()
      : String(row.deleted_at);
  }

  return lead;
}

export function mapAccount(row: Record<string, unknown>): Account {
  const account: Account = {
    id: String(row.id),
    name: String(row.name),
    type: row.type as Account["type"],
    region: String(row.region),
    areaHa: Number(row.area_ha ?? 0),
    mainCrop: String(row.main_crop ?? ""),
    owner: String(row.owner),
    activeMatters: Number(row.active_matters ?? 0),
    activeOpportunities: Number(row.active_opportunities ?? 0),
    since: String(row.since ?? ""),
  };

  const properties = parseStringArray(row.properties);
  const contacts = parseStringArray(row.contacts);
  const contractedAreas = parseStringArray(row.contracted_areas);
  const mappedRisks = parseStringArray(row.mapped_risks);

  if (properties?.length) account.properties = properties;
  if (contacts?.length) account.contacts = contacts;
  if (contractedAreas?.length) account.contractedAreas = contractedAreas;
  if (mappedRisks?.length) account.mappedRisks = mappedRisks;
  if (row.relationship_status) {
    account.relationshipStatus =
      row.relationship_status as Account["relationshipStatus"];
  }
  if (row.deleted_at) {
    account.deletedAt = row.deleted_at instanceof Date
      ? row.deleted_at.toISOString()
      : String(row.deleted_at);
  }

  return account;
}

export function mapOpportunity(row: Record<string, unknown>): Opportunity {
  const opp: Opportunity = {
    id: String(row.id),
    title: String(row.title),
    accountName: String(row.account_name),
    accountId: row.account_id ? String(row.account_id) : undefined,
    stage: mapLegacyOpportunityStage(row.stage),
    valueBrl: Number(row.value_brl),
    owner: String(row.owner),
    expectedClose: toDateStr(row.expected_close),
    nextContact: row.next_contact ? toDateStr(row.next_contact) : null,
    priority: (row.priority as Opportunity["priority"]) ?? "normal",
    practice: String(row.practice ?? ""),
  };

  if (row.probability != null) opp.probability = Number(row.probability);
  if (row.next_step) opp.nextStep = String(row.next_step);
  if (row.lead_id) opp.leadId = String(row.lead_id);
  if (row.deleted_at) {
    opp.deletedAt = row.deleted_at instanceof Date
      ? row.deleted_at.toISOString()
      : String(row.deleted_at);
  }

  return opp;
}

export function mapMatter(row: Record<string, unknown>): Matter {
  const matter: Matter = {
    id: String(row.id),
    title: String(row.title),
    accountName: String(row.account_name),
    accountId: row.account_id ? String(row.account_id) : undefined,
    practice: String(row.practice),
    status: row.status as Matter["status"],
    risk: row.risk as Matter["risk"],
    deadline: toDateStr(row.deadline),
    owner: String(row.owner),
    description: String(row.description ?? ""),
  };

  if (row.urgency) matter.urgency = row.urgency as Matter["urgency"];
  if (row.next_steps) matter.nextSteps = String(row.next_steps);

  const pendingDocuments = parseStringArray(row.pending_documents);
  if (pendingDocuments?.length) matter.pendingDocuments = pendingDocuments;

  if (row.cnj_number) matter.cnjNumber = String(row.cnj_number);
  if (row.court) matter.court = String(row.court);
  if (row.phase) matter.phase = row.phase as Matter["phase"];
  if (row.opposing_party) matter.opposingParty = String(row.opposing_party);
  if (row.claim_value_brl != null) {
    matter.claimValueBrl = Number(row.claim_value_brl);
  }
  if (row.opportunity_id) matter.opportunityId = String(row.opportunity_id);
  if (row.deleted_at) {
    matter.deletedAt = row.deleted_at instanceof Date
      ? row.deleted_at.toISOString()
      : String(row.deleted_at);
  }

  return matter;
}

export function mapDeadline(row: Record<string, unknown>): Deadline {
  const deadline: Deadline = {
    id: String(row.id),
    matterId: String(row.matter_id),
    title: String(row.title),
    type: row.type as Deadline["type"],
    status: row.status as Deadline["status"],
    dueDate: toDateStr(row.due_date),
    owner: String(row.owner),
    completedAt: row.completed_at ? toDateStr(row.completed_at) : null,
  };
  if (row.notes) deadline.notes = String(row.notes);
  return deadline;
}

export function mapActivity(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id),
    entityType: row.entity_type as Activity["entityType"],
    entityId: String(row.entity_id),
    type: row.type as Activity["type"],
    summary: String(row.summary),
    date: toDateStr(row.date),
    owner: String(row.owner),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? ""),
  };
}

export function mapDocument(row: Record<string, unknown>): Document {
  const doc: Document = {
    id: String(row.id),
    name: String(row.name),
    category: row.category as Document["category"],
    status: row.status as Document["status"],
    entityType: row.entity_type as Document["entityType"],
    entityId: String(row.entity_id),
    version: Number(row.version ?? 1),
    versions: parseJsonValue<DocumentVersion[]>(row.versions, []),
    owner: String(row.owner),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
  if (row.matter_id != null) doc.matterId = String(row.matter_id);
  if (row.description != null) doc.description = String(row.description);
  if (row.file_name != null) doc.fileName = String(row.file_name);
  if (row.file_size != null) doc.fileSize = Number(row.file_size);
  if (row.mime_type != null) doc.mimeType = String(row.mime_type);
  const tags = parseStringArray(row.tags);
  if (tags?.length) doc.tags = tags;
  if (row.due_date != null) doc.dueDate = toDateStr(row.due_date);
  if (row.deleted_at) doc.deletedAt = toIso(row.deleted_at);
  return doc;
}

export function mapContact(row: Record<string, unknown>): Contact {
  const contact: Contact = {
    id: String(row.id),
    name: String(row.name),
    role: row.role as Contact["role"],
    isPrimary: Boolean(row.is_primary),
    accountIds: parseStringArray(row.account_ids) ?? [],
    owner: String(row.owner),
    createdAt: toIso(row.created_at),
  };
  if (row.email != null) contact.email = String(row.email);
  if (row.phone != null) contact.phone = String(row.phone);
  if (row.whatsapp != null) contact.whatsapp = String(row.whatsapp);
  if (row.cpf != null) contact.cpf = String(row.cpf);
  if (row.department != null) contact.department = String(row.department);
  if (row.notes != null) contact.notes = String(row.notes);
  if (row.deleted_at) contact.deletedAt = toIso(row.deleted_at);
  return contact;
}

export function mapProperty(row: Record<string, unknown>): Property {
  const property: Property = {
    id: String(row.id),
    name: String(row.name),
    type: row.type as Property["type"],
    accountId: String(row.account_id),
    areaHa: Number(row.area_ha ?? 0),
    owner: String(row.owner),
    createdAt: toIso(row.created_at),
  };
  if (row.car_number != null) property.carNumber = String(row.car_number);
  if (row.matricula != null) property.matricula = String(row.matricula);
  if (row.declared_area_ha != null) property.declaredAreaHa = Number(row.declared_area_ha);
  if (row.car_area_ha != null) property.carAreaHa = Number(row.car_area_ha);
  if (row.matricula_area_ha != null) property.matriculaAreaHa = Number(row.matricula_area_ha);
  if (row.location != null) property.location = String(row.location);
  if (row.municipality != null) property.municipality = String(row.municipality);
  if (row.state != null) property.state = String(row.state);
  if (row.gps != null) property.GPS = String(row.gps);
  if (row.main_crop != null) property.mainCrop = String(row.main_crop);
  const encumbrances = parseStringArray(row.encumbrances);
  if (encumbrances?.length) property.encumbrances = encumbrances;
  const restrictions = parseStringArray(row.restrictions);
  if (restrictions?.length) property.restrictions = restrictions;
  if (row.notes != null) property.notes = String(row.notes);
  if (row.deleted_at) property.deletedAt = toIso(row.deleted_at);
  return property;
}

export function mapInvoice(row: Record<string, unknown>): Invoice {
  const invoice: Invoice = {
    id: String(row.id),
    accountId: String(row.account_id),
    number: String(row.number),
    status: row.status as Invoice["status"],
    totalBrl: Number(row.total_brl ?? 0),
    issuedAt: toDateStr(row.issued_at),
    dueAt: toDateStr(row.due_at),
    timeEntryIds: parseStringArray(row.time_entry_ids) ?? [],
    createdAt: toIso(row.created_at),
  };
  if (row.matter_id != null) invoice.matterId = String(row.matter_id);
  if (row.paid_at != null) invoice.paidAt = toDateStr(row.paid_at);
  if (row.notes != null) invoice.notes = String(row.notes);
  if (row.deleted_at) invoice.deletedAt = toIso(row.deleted_at);
  return invoice;
}

export function mapDocumentChecklistItem(
  row: Record<string, unknown>,
): DocumentChecklistItem {
  const item: DocumentChecklistItem = {
    id: String(row.id),
    matterId: String(row.matter_id),
    label: String(row.label),
    category: row.category as DocumentChecklistItem["category"],
    required: Boolean(row.required),
    status: row.status as DocumentChecklistItem["status"],
    createdAt: toIso(row.created_at),
  };
  item.documentId = row.document_id != null ? String(row.document_id) : null;
  if (row.notes != null) item.notes = String(row.notes);
  return item;
}

export function mapTimeEntry(row: Record<string, unknown>): TimeEntry {
  const entry: TimeEntry = {
    id: String(row.id),
    matterId: String(row.matter_id),
    description: String(row.description),
    hours: Number(row.hours ?? 0),
    hourlyRate: Number(row.hourly_rate ?? 0),
    totalBrl: Number(row.total_brl ?? 0),
    type: row.type as TimeEntry["type"],
    date: toDateStr(row.date),
    owner: String(row.owner),
    billable: Boolean(row.billable),
    invoiced: Boolean(row.invoiced),
    createdAt: toIso(row.created_at),
  };
  if (row.task_id != null) entry.taskId = String(row.task_id);
  if (row.invoice_id != null) entry.invoiceId = String(row.invoice_id);
  if (row.deleted_at) entry.deletedAt = toIso(row.deleted_at);
  return entry;
}

export function mapFeeAgreement(row: Record<string, unknown>): FeeAgreement {
  const fee: FeeAgreement = {
    id: String(row.id),
    accountId: String(row.account_id),
    type: row.type as FeeAgreement["type"],
    description: String(row.description ?? ""),
    signedAt: toDateStr(row.signed_at),
    active: Boolean(row.active),
    createdAt: toIso(row.created_at),
  };
  if (row.matter_id != null) fee.matterId = String(row.matter_id);
  if (row.hourly_rate != null) fee.hourlyRate = Number(row.hourly_rate);
  if (row.fixed_value != null) fee.fixedValue = Number(row.fixed_value);
  if (row.percentage != null) fee.percentage = Number(row.percentage);
  if (row.success_fee_percentage != null) fee.successFeePercentage = Number(row.success_fee_percentage);
  if (row.cap_value != null) fee.capValue = Number(row.cap_value);
  if (row.expires_at != null && row.expires_at !== "") fee.expiresAt = toDateStr(row.expires_at);
  if (row.deleted_at) fee.deletedAt = toIso(row.deleted_at);
  return fee;
}

export function mapOpposingParty(row: Record<string, unknown>): OpposingParty {
  const party: OpposingParty = {
    id: String(row.id),
    name: String(row.name),
    type: row.type as OpposingParty["type"],
    matters: parseStringArray(row.matters) ?? [],
    createdAt: toIso(row.created_at),
  };
  if (row.cpf != null) party.cpf = String(row.cpf);
  if (row.cnpj != null) party.cnpj = String(row.cnpj);
  if (row.lawyer != null) party.lawyer = String(row.lawyer);
  if (row.lawyer_oab != null) party.lawyerOab = String(row.lawyer_oab);
  if (row.phone != null) party.phone = String(row.phone);
  if (row.email != null) party.email = String(row.email);
  if (row.address != null) party.address = String(row.address);
  if (row.notes != null) party.notes = String(row.notes);
  if (row.deleted_at) party.deletedAt = toIso(row.deleted_at);
  return party;
}

export function mapCropSeason(row: Record<string, unknown>): CropSeason {
  const season: CropSeason = {
    id: String(row.id),
    name: String(row.name),
    year: Number(row.year),
    plantingStart: String(row.planting_start ?? ""),
    plantingEnd: String(row.planting_end ?? ""),
    harvestStart: String(row.harvest_start ?? ""),
    harvestEnd: String(row.harvest_end ?? ""),
    mainCrop: String(row.main_crop ?? ""),
    createdAt: toIso(row.created_at),
  };
  if (row.region != null) season.region = String(row.region);
  if (row.notes != null) season.notes = String(row.notes);
  return season;
}

export function mapTaxObligation(row: Record<string, unknown>): TaxObligation {
  const tax: TaxObligation = {
    id: String(row.id),
    propertyId: String(row.property_id),
    accountId: String(row.account_id),
    type: row.type as TaxObligation["type"],
    year: Number(row.year),
    valueBrl: Number(row.value_brl ?? 0),
    dueDate: toDateStr(row.due_date),
    status: row.status as TaxObligation["status"],
    createdAt: toIso(row.created_at),
  };
  tax.paidDate = row.paid_date != null && row.paid_date !== "" ? toDateStr(row.paid_date) : null;
  if (row.notes != null) tax.notes = String(row.notes);
  if (row.deleted_at) tax.deletedAt = toIso(row.deleted_at);
  return tax;
}

export function mapEnvironmentalLicense(
  row: Record<string, unknown>,
): EnvironmentalLicense {
  const license: EnvironmentalLicense = {
    id: String(row.id),
    propertyId: String(row.property_id),
    accountId: String(row.account_id),
    type: String(row.type ?? ""),
    number: String(row.number),
    issuer: String(row.issuer ?? ""),
    issuedAt: toDateStr(row.issued_at),
    expiresAt: toDateStr(row.expires_at),
    status: row.status as EnvironmentalLicense["status"],
    createdAt: toIso(row.created_at),
  };
  const conditions = parseStringArray(row.conditions);
  if (conditions?.length) license.conditions = conditions;
  if (row.notes != null) license.notes = String(row.notes);
  if (row.deleted_at) license.deletedAt = toIso(row.deleted_at);
  return license;
}

export function mapCreditInstrument(
  row: Record<string, unknown>,
): CreditInstrument {
  const credit: CreditInstrument = {
    id: String(row.id),
    accountId: String(row.account_id),
    type: row.type as CreditInstrument["type"],
    number: String(row.number ?? ""),
    valueBrl: Number(row.value_brl ?? 0),
    issueDate: toDateStr(row.issue_date),
    maturityDate: toDateStr(row.maturity_date),
    status: row.status as CreditInstrument["status"],
    createdAt: toIso(row.created_at),
  };
  if (row.matter_id != null) credit.matterId = String(row.matter_id);
  if (row.issuer != null) credit.issuer = String(row.issuer);
  if (row.interest_rate != null) credit.interestRate = Number(row.interest_rate);
  if (row.iof_rate != null) credit.iofRate = Number(row.iof_rate);
  if (row.payment_method != null) credit.paymentMethod = String(row.payment_method);
  if (row.installments != null) credit.installments = Number(row.installments);
  if (row.notes != null) credit.notes = String(row.notes);
  if (row.deleted_at) credit.deletedAt = toIso(row.deleted_at);
  return credit;
}

export function mapTask(row: Record<string, unknown>): Task {
  const task: Task = {
    id: String(row.id),
    title: String(row.title),
    relatedTo: String(row.related_to),
    type: row.type as Task["type"],
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    dueDate: toDateStr(row.due_date),
    owner: String(row.owner),
  };
  if (row.deleted_at) {
    task.deletedAt = row.deleted_at instanceof Date
      ? row.deleted_at.toISOString()
      : String(row.deleted_at);
  }
  return task;
}