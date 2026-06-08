/** Rotas canônicas do Hub Agro — prefixo /agro para separação lógica */

export const ROUTES = {
  home: "/agro/command-center",
  commandCenter: "/agro/command-center",
  institucional: "/institucional",
  crm: {
    root: "/agro/crm",
    leads: "/agro/crm/leads",
    accounts: "/agro/crm/accounts",
    opportunities: "/agro/crm/opportunities",
    matters: "/agro/crm/matters",
    tasks: "/agro/crm/tasks",
  },
} as const;

export function isCrmPath(path: string) {
  return path.startsWith("/agro/crm") || path.startsWith("/crm");
}