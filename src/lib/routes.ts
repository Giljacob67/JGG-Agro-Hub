/** Rotas canônicas do Hub Agro — prefixo /agro para separação lógica */

export const ROUTES = {
  home: "/agro/command-center",
  commandCenter: "/agro/command-center",
  login: "/agro/login",
  copilot: "/agro/copilot",
  knowledge: "/agro/knowledge",
  audit: "/agro/audit",
  calendar: "/agro/calendar",
  reports: "/agro/reports",
  productivity: "/agro/productivity",
  settings: "/agro/settings",
  institucional: "/institucional",
  crm: {
    root: "/agro/crm",
    leads: "/agro/crm/leads",
    leadDetail: (id: string) => `/agro/crm/leads/${id}`,
    accounts: "/agro/crm/accounts",
    accountDetail: (id: string) => `/agro/crm/accounts/${id}`,
    opportunities: "/agro/crm/opportunities",
    opportunityDetail: (id: string) => `/agro/crm/opportunities/${id}`,
    matters: "/agro/crm/matters",
    matterDetail: (id: string) => `/agro/crm/matters/${id}`,
    tasks: "/agro/crm/tasks",
  },
} as const;

export function isCrmPath(path: string) {
  return path.startsWith("/agro/crm") || path.startsWith("/crm");
}