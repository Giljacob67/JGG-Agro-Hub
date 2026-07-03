export const crmKeys = {
  all: ["crm"] as const,
  leads: ["crm", "leads"] as const,
  lead: (id: string) => ["crm", "leads", id] as const,
  leadLists: ["crm", "lead-lists"] as const,
  accounts: ["crm", "accounts"] as const,
  account: (id: string) => ["crm", "accounts", id] as const,
  opportunities: ["crm", "opportunities"] as const,
  opportunity: (id: string) => ["crm", "opportunities", id] as const,
  matters: ["crm", "matters"] as const,
  matter: (id: string) => ["crm", "matters", id] as const,
  tasks: ["crm", "tasks"] as const,
  stats: ["crm", "stats"] as const,
  timeseries: ["crm", "timeseries"] as const,
  relatedTasks: (id: string) => ["crm", "tasks", "related", id] as const,
  deadlines: (matterId?: string) =>
    matterId
      ? (["crm", "deadlines", matterId] as const)
      : (["crm", "deadlines"] as const),
  activities: (entityId?: string) =>
    entityId
      ? (["crm", "activities", entityId] as const)
      : (["crm", "activities"] as const),
  mattersByOpportunity: (opportunityId: string) =>
    ["crm", "matters", "by-opportunity", opportunityId] as const,
  users: ["crm", "users"] as const,
  meetings: ["crm", "meetings"] as const,
};

export const auditKeys = {
  all: ["audit"] as const,
  list: (params: Record<string, unknown>) => ["audit", "list", params] as const,
  stats: ["audit", "stats"] as const,
};
