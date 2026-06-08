import type { CopilotContextEntity, CrmStats } from "@shared/agro/types";

export interface CopilotContextOption {
  value: string;
  label: string;
  entity: CopilotContextEntity | null;
}

export function buildCopilotContextOptions(stats: CrmStats): CopilotContextOption[] {
  const options: CopilotContextOption[] = [];

  for (const m of stats.riskAlerts.slice(0, 4)) {
    options.push({
      value: `matter-${m.id}`,
      label: `Demanda · ${m.title}`,
      entity: { type: "demanda", id: m.id, name: m.title },
    });
  }

  for (const o of stats.priorityOpportunities.slice(0, 4)) {
    options.push({
      value: `opp-${o.id}`,
      label: `Oportunidade · ${o.title}`,
      entity: { type: "oportunidade", id: o.id, name: o.title },
    });
  }

  return options;
}