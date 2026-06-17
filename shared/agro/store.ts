import {
  SEED_ACCOUNTS,
  SEED_ACTIVITIES,
  SEED_CREDIT_INSTRUMENTS,
  SEED_CROP_SEASONS,
  SEED_DEADLINES,
  SEED_ENVIRONMENTAL_LICENSES,
  SEED_LEADS,
  SEED_MATTERS,
  SEED_OPPORTUNITIES,
  SEED_TASKS,
  SEED_TAX_OBLIGATIONS,
} from "./seed.js";
import type {
  Account,
  Activity,
  ActivityEntityType,
  Contact,
  CropSeason,
  CreditInstrument,
  Deadline,
  Document,
  DocumentChecklistItem,
  EnvironmentalLicense,
  FeeAgreement,
  Invoice,
  Lead,
  Matter,
  Opportunity,
  OpposingParty,
  Property,
  TaxObligation,
  Task,
  TimeEntry,
} from "./types.js";

/** Store em memória — substituível por PostgreSQL via repositório. */
const store = {
  leads: structuredClone(SEED_LEADS),
  accounts: structuredClone(SEED_ACCOUNTS),
  opportunities: structuredClone(SEED_OPPORTUNITIES),
  matters: structuredClone(SEED_MATTERS),
  tasks: structuredClone(SEED_TASKS),
  deadlines: structuredClone(SEED_DEADLINES),
  activities: structuredClone(SEED_ACTIVITIES),
  documents: [] as Document[],
  documentChecklist: [] as DocumentChecklistItem[],
  timeEntries: [] as TimeEntry[],
  invoices: [] as Invoice[],
  feeAgreements: [] as FeeAgreement[],
  contacts: [] as Contact[],
  properties: [] as Property[],
  opposingParties: [] as OpposingParty[],
  taxObligations: structuredClone(SEED_TAX_OBLIGATIONS),
  environmentalLicenses: structuredClone(SEED_ENVIRONMENTAL_LICENSES),
  creditInstruments: structuredClone(SEED_CREDIT_INSTRUMENTS),
  cropSeasons: structuredClone(SEED_CROP_SEASONS),
};

export function listLeads(): Lead[] {
  return store.leads;
}

export function getLead(id: string): Lead | undefined {
  return store.leads.find((l) => l.id === id);
}

export function listAccounts(): Account[] {
  return store.accounts;
}

export function getAccount(id: string): Account | undefined {
  return store.accounts.find((a) => a.id === id);
}

export function listOpportunities(): Opportunity[] {
  return store.opportunities;
}

export function getOpportunity(id: string): Opportunity | undefined {
  return store.opportunities.find((o) => o.id === id);
}

export function listMatters(): Matter[] {
  return store.matters;
}

export function getMatter(id: string): Matter | undefined {
  return store.matters.find((m) => m.id === id);
}

export function listTasks(): Task[] {
  return store.tasks;
}

export function getTask(id: string): Task | undefined {
  return store.tasks.find((t) => t.id === id);
}

export function getRelatedTasks(entityId: string): Task[] {
  return store.tasks.filter((t) => t.relatedTo === entityId);
}

export function getAccountTimeline(accountId: string) {
  return {
    leads: store.leads.filter((l) => l.accountId === accountId),
    opportunities: store.opportunities.filter((o) => o.accountId === accountId),
    matters: store.matters.filter((m) => m.accountId === accountId),
    tasks: store.tasks.filter((t) => {
      const prefix = t.relatedTo.split("-")[0];
      const entity =
        prefix === "LD"
          ? store.leads.find((l) => l.id === t.relatedTo)
          : prefix === "OP"
            ? store.opportunities.find((o) => o.id === t.relatedTo)
            : prefix === "MT"
              ? store.matters.find((m) => m.id === t.relatedTo)
              : undefined;
      if (!entity) return false;
      if ("accountId" in entity && entity.accountId === accountId) return true;
      return false;
    }),
  };
}

export function addLead(lead: Lead) {
  store.leads.push(lead);
}

export function addAccount(account: Account) {
  store.accounts.push(account);
}

export function patchAccount(id: string, patch: Partial<Account>): Account | undefined {
  const account = getAccount(id);
  if (!account) return undefined;
  Object.assign(account, patch);
  return account;
}

export function patchLead(id: string, patch: Partial<Lead>): Lead | undefined {
  const lead = getLead(id);
  if (!lead) return undefined;
  Object.assign(lead, patch);
  return lead;
}

export function addTask(task: Task) {
  store.tasks.push(task);
}

export function patchTask(id: string, patch: Partial<Task>): Task | undefined {
  const task = getTask(id);
  if (!task) return undefined;
  Object.assign(task, patch);
  return task;
}

export function patchOpportunity(
  id: string,
  patch: Partial<Opportunity>,
): Opportunity | undefined {
  const opp = getOpportunity(id);
  if (!opp) return undefined;
  Object.assign(opp, patch);
  return opp;
}

export function addMatter(matter: Matter) {
  store.matters.push(matter);
}

export function patchMatter(
  id: string,
  patch: Partial<Matter>,
): Matter | undefined {
  const matter = getMatter(id);
  if (!matter) return undefined;
  Object.assign(matter, patch);
  return matter;
}

/* ---------------------------------------------------------------- Prazos */

export function listDeadlines(matterId?: string): Deadline[] {
  if (!matterId) return store.deadlines;
  return store.deadlines.filter((d) => d.matterId === matterId);
}

export function getDeadline(id: string): Deadline | undefined {
  return store.deadlines.find((d) => d.id === id);
}

export function addDeadline(deadline: Deadline) {
  store.deadlines.push(deadline);
}

export function patchDeadline(
  id: string,
  patch: Partial<Pick<Deadline, "status" | "dueDate" | "completedAt" | "owner">> & {
    notes?: string | null;
  },
): Deadline | undefined {
  const deadline = getDeadline(id);
  if (!deadline) return undefined;
  Object.assign(deadline, patch);
  return deadline;
}

export function nextDeadlineId(): string {
  return `DL-${String(store.deadlines.length + 501).padStart(3, "0")}`;
}

/* ------------------------------------------------------------ Interações */

export function listActivities(
  entityId?: string,
  entityType?: ActivityEntityType,
): Activity[] {
  let result = store.activities;
  if (entityId) result = result.filter((a) => a.entityId === entityId);
  if (entityType) result = result.filter((a) => a.entityType === entityType);
  return [...result].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function addActivity(activity: Activity) {
  store.activities.push(activity);
}

export function nextActivityId(): string {
  return `ACT-${String(store.activities.length + 601).padStart(3, "0")}`;
}

/* ------------------------------------------------ Conversão e vínculos */

export function listMattersByOpportunity(opportunityId: string): Matter[] {
  return store.matters.filter((m) => m.opportunityId === opportunityId);
}

export function nextOpportunityId(): string {
  return `OP-${String(store.opportunities.length + 201).padStart(3, "0")}`;
}

export function addOpportunity(opp: Opportunity) {
  store.opportunities.push(opp);
}

// ── Document Management ────────────────────────────────────────────

export function listDocuments(filters?: { entityType?: string; entityId?: string; matterId?: string }): Document[] {
  let result = store.documents.filter((d) => !d.deletedAt);
  if (filters?.entityType) result = result.filter((d) => d.entityType === filters.entityType);
  if (filters?.entityId) result = result.filter((d) => d.entityId === filters.entityId);
  if (filters?.matterId) result = result.filter((d) => d.matterId === filters.matterId);
  return result;
}

export function getDocument(id: string): Document | undefined {
  return store.documents.find((d) => d.id === id && !d.deletedAt);
}

export function addDocument(doc: Document): Document {
  store.documents.push(doc);
  return doc;
}

export function patchDocument(id: string, patch: Partial<Document>): Document | undefined {
  const doc = store.documents.find((d) => d.id === id && !d.deletedAt);
  if (!doc) return undefined;
  Object.assign(doc, patch, { updatedAt: new Date().toISOString() });
  return doc;
}

export function deleteDocument(id: string): boolean {
  const doc = store.documents.find((d) => d.id === id);
  if (!doc) return false;
  doc.deletedAt = new Date().toISOString();
  return true;
}

// ── Document Checklist ─────────────────────────────────────────────

export function listDocumentChecklist(matterId: string): DocumentChecklistItem[] {
  return store.documentChecklist.filter((c) => c.matterId === matterId);
}

export function addDocumentChecklistItem(item: DocumentChecklistItem): DocumentChecklistItem {
  store.documentChecklist.push(item);
  return item;
}

export function patchDocumentChecklistItem(id: string, patch: Partial<DocumentChecklistItem>): DocumentChecklistItem | undefined {
  const item = store.documentChecklist.find((c) => c.id === id);
  if (!item) return undefined;
  Object.assign(item, patch);
  return item;
}

export function deleteDocumentChecklistItem(id: string): boolean {
  const idx = store.documentChecklist.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  store.documentChecklist.splice(idx, 1);
  return true;
}

// ── Time Tracking ──────────────────────────────────────────────────

export function listTimeEntries(filters?: { matterId?: string; owner?: string; invoiced?: boolean }): TimeEntry[] {
  let result = store.timeEntries.filter((t) => !t.deletedAt);
  if (filters?.matterId) result = result.filter((t) => t.matterId === filters.matterId);
  if (filters?.owner) result = result.filter((t) => t.owner === filters.owner);
  if (filters?.invoiced !== undefined) result = result.filter((t) => t.invoiced === filters.invoiced);
  return result;
}

export function getTimeEntry(id: string): TimeEntry | undefined {
  return store.timeEntries.find((t) => t.id === id && !t.deletedAt);
}

export function addTimeEntry(entry: TimeEntry): TimeEntry {
  store.timeEntries.push(entry);
  return entry;
}

export function patchTimeEntry(id: string, patch: Partial<TimeEntry>): TimeEntry | undefined {
  const entry = store.timeEntries.find((t) => t.id === id && !t.deletedAt);
  if (!entry) return undefined;
  Object.assign(entry, patch);
  return entry;
}

export function deleteTimeEntry(id: string): boolean {
  const entry = store.timeEntries.find((t) => t.id === id);
  if (!entry) return false;
  entry.deletedAt = new Date().toISOString();
  return true;
}

// ── Invoices ───────────────────────────────────────────────────────

export function listInvoices(filters?: { accountId?: string; status?: string }): Invoice[] {
  let result = store.invoices.filter((i) => !i.deletedAt);
  if (filters?.accountId) result = result.filter((i) => i.accountId === filters.accountId);
  if (filters?.status) result = result.filter((i) => i.status === filters.status);
  return result;
}

export function getInvoice(id: string): Invoice | undefined {
  return store.invoices.find((i) => i.id === id && !i.deletedAt);
}

export function addInvoice(invoice: Invoice): Invoice {
  store.invoices.push(invoice);
  return invoice;
}

export function patchInvoice(id: string, patch: Partial<Invoice>): Invoice | undefined {
  const invoice = store.invoices.find((i) => i.id === id && !i.deletedAt);
  if (!invoice) return undefined;
  Object.assign(invoice, patch);
  return invoice;
}

// ── Fee Agreements ─────────────────────────────────────────────────

export function listFeeAgreements(filters?: { accountId?: string; matterId?: string }): FeeAgreement[] {
  let result = store.feeAgreements.filter((f) => !f.deletedAt);
  if (filters?.accountId) result = result.filter((f) => f.accountId === filters.accountId);
  if (filters?.matterId) result = result.filter((f) => f.matterId === filters.matterId);
  return result;
}

export function addFeeAgreement(agreement: FeeAgreement): FeeAgreement {
  store.feeAgreements.push(agreement);
  return agreement;
}

// ── Contacts ───────────────────────────────────────────────────────

export function listContacts(filters?: { accountId?: string }): Contact[] {
  let result = store.contacts.filter((c) => !c.deletedAt);
  if (filters?.accountId) result = result.filter((c) => c.accountIds.includes(filters.accountId!));
  return result;
}

export function getContact(id: string): Contact | undefined {
  return store.contacts.find((c) => c.id === id && !c.deletedAt);
}

export function addContact(contact: Contact): Contact {
  store.contacts.push(contact);
  return contact;
}

export function patchContact(id: string, patch: Partial<Contact>): Contact | undefined {
  const contact = store.contacts.find((c) => c.id === id && !c.deletedAt);
  if (!contact) return undefined;
  Object.assign(contact, patch);
  return contact;
}

export function deleteContact(id: string): boolean {
  const contact = store.contacts.find((c) => c.id === id);
  if (!contact) return false;
  contact.deletedAt = new Date().toISOString();
  return true;
}

// ── Properties ─────────────────────────────────────────────────────

export function listProperties(filters?: { accountId?: string }): Property[] {
  let result = store.properties.filter((p) => !p.deletedAt);
  if (filters?.accountId) result = result.filter((p) => p.accountId === filters.accountId);
  return result;
}

export function getProperty(id: string): Property | undefined {
  return store.properties.find((p) => p.id === id && !p.deletedAt);
}

export function addProperty(property: Property): Property {
  store.properties.push(property);
  return property;
}

export function patchProperty(id: string, patch: Partial<Property>): Property | undefined {
  const property = store.properties.find((p) => p.id === id && !p.deletedAt);
  if (!property) return undefined;
  Object.assign(property, patch);
  return property;
}

export function deleteProperty(id: string): boolean {
  const property = store.properties.find((p) => p.id === id);
  if (!property) return false;
  property.deletedAt = new Date().toISOString();
  return true;
}

// ── Opposing Parties ───────────────────────────────────────────────

export function listOpposingParties(): OpposingParty[] {
  return store.opposingParties.filter((o) => !o.deletedAt);
}

export function getOpposingParty(id: string): OpposingParty | undefined {
  return store.opposingParties.find((o) => o.id === id && !o.deletedAt);
}

export function addOpposingParty(party: OpposingParty): OpposingParty {
  store.opposingParties.push(party);
  return party;
}

export function patchOpposingParty(id: string, patch: Partial<OpposingParty>): OpposingParty | undefined {
  const party = store.opposingParties.find((o) => o.id === id && !o.deletedAt);
  if (!party) return undefined;
  Object.assign(party, patch);
  return party;
}

// ── Tax Obligations ────────────────────────────────────────────────

export function listTaxObligations(filters?: { propertyId?: string; accountId?: string; year?: number }): TaxObligation[] {
  let result = store.taxObligations.filter((t) => !t.deletedAt);
  if (filters?.propertyId) result = result.filter((t) => t.propertyId === filters.propertyId);
  if (filters?.accountId) result = result.filter((t) => t.accountId === filters.accountId);
  if (filters?.year) result = result.filter((t) => t.year === filters.year);
  return result;
}

export function addTaxObligation(tax: TaxObligation): TaxObligation {
  store.taxObligations.push(tax);
  return tax;
}

// ── Environmental Licenses ─────────────────────────────────────────

export function listEnvironmentalLicenses(filters?: { propertyId?: string; accountId?: string }): EnvironmentalLicense[] {
  let result = store.environmentalLicenses.filter((l) => !l.deletedAt);
  if (filters?.propertyId) result = result.filter((l) => l.propertyId === filters.propertyId);
  if (filters?.accountId) result = result.filter((l) => l.accountId === filters.accountId);
  return result;
}

export function addEnvironmentalLicense(license: EnvironmentalLicense): EnvironmentalLicense {
  store.environmentalLicenses.push(license);
  return license;
}

// ── Credit Instruments ─────────────────────────────────────────────

export function listCreditInstruments(filters?: { accountId?: string; matterId?: string }): CreditInstrument[] {
  let result = store.creditInstruments.filter((c) => !c.deletedAt);
  if (filters?.accountId) result = result.filter((c) => c.accountId === filters.accountId);
  if (filters?.matterId) result = result.filter((c) => c.matterId === filters.matterId);
  return result;
}

export function addCreditInstrument(instrument: CreditInstrument): CreditInstrument {
  store.creditInstruments.push(instrument);
  return instrument;
}

// ── Crop Seasons ────────────────────────────────────────────────

export function listCropSeasons(filters?: { year?: number; region?: string }): CropSeason[] {
  let result = [...store.cropSeasons];
  if (filters?.year) result = result.filter((s) => s.year === filters.year);
  if (filters?.region) result = result.filter((s) => s.region === filters.region);
  return result;
}

export function getCropSeason(id: string): CropSeason | undefined {
  return store.cropSeasons.find((s) => s.id === id);
}

export function addCropSeason(season: CropSeason): CropSeason {
  store.cropSeasons.push(season);
  return season;
}

export function updateCropSeason(id: string, patch: Partial<CropSeason>): CropSeason | undefined {
  const season = store.cropSeasons.find((s) => s.id === id);
  if (!season) return undefined;
  Object.assign(season, patch);
  return season;
}

// ── Reset ──────────────────────────────────────────────────────────

/** Apenas para testes — reinicia o store. */
export function resetStore() {
  store.leads = structuredClone(SEED_LEADS);
  store.accounts = structuredClone(SEED_ACCOUNTS);
  store.opportunities = structuredClone(SEED_OPPORTUNITIES);
  store.matters = structuredClone(SEED_MATTERS);
  store.tasks = structuredClone(SEED_TASKS);
  store.deadlines = structuredClone(SEED_DEADLINES);
  store.activities = structuredClone(SEED_ACTIVITIES);
  store.documents = [];
  store.documentChecklist = [];
  store.timeEntries = [];
  store.invoices = [];
  store.feeAgreements = [];
  store.contacts = [];
  store.properties = [];
  store.opposingParties = [];
  store.taxObligations = structuredClone(SEED_TAX_OBLIGATIONS);
  store.environmentalLicenses = structuredClone(SEED_ENVIRONMENTAL_LICENSES);
  store.creditInstruments = structuredClone(SEED_CREDIT_INSTRUMENTS);
  store.cropSeasons = structuredClone(SEED_CROP_SEASONS);
}
