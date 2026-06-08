import {
  MOCK_LEADS,
  MOCK_OPPORTUNITIES,
  MOCK_MATTERS,
  MOCK_TASKS,
  OPPORTUNITY_STAGES,
} from "./crm-mock-data";
import { formatBrl, isOverdue, isWithinDays } from "./crm-labels";
import type { Lead, Matter, Opportunity, Task } from "./crm-types";

const OPEN_STAGES = new Set(["qualificacao", "proposta", "negociacao"]);

export function getActiveLeads(): Lead[] {
  return MOCK_LEADS.filter((l) => l.status !== "descartado");
}

export function getOpenOpportunities(): Opportunity[] {
  return MOCK_OPPORTUNITIES.filter(
    (o) => o.stage !== "perdido" && o.stage !== "contrato",
  );
}

export function getActiveMatters(): Matter[] {
  return MOCK_MATTERS.filter((m) => m.status !== "concluida");
}

export function getOpenTasks(): Task[] {
  return MOCK_TASKS.filter((t) => t.status !== "concluida");
}

export function getOverdueTasks(): Task[] {
  return getOpenTasks().filter(
    (t) => t.status === "atrasada" || isOverdue(t.dueDate),
  );
}

export function getUpcomingTasks(days = 7): Task[] {
  return getOpenTasks().filter(
    (t) => !isOverdue(t.dueDate) && isWithinDays(t.dueDate, days),
  );
}

export function getPipelineValue(opportunities = getOpenOpportunities()) {
  return opportunities.reduce((sum, o) => sum + o.valueBrl, 0);
}

export function getPipelineByStage() {
  return OPPORTUNITY_STAGES.filter((s) => s.id !== "perdido").map((stage) => {
    const items = MOCK_OPPORTUNITIES.filter((o) => o.stage === stage.id);
    return {
      ...stage,
      count: items.length,
      value: items.reduce((s, o) => s + o.valueBrl, 0),
    };
  });
}

export function getPriorityOpportunities(): Opportunity[] {
  return getOpenOpportunities()
    .filter((o) => o.priority === "alta" || OPEN_STAGES.has(o.stage))
    .sort((a, b) => b.valueBrl - a.valueBrl)
    .slice(0, 5);
}

export function getRiskAlerts(): Matter[] {
  return getActiveMatters()
    .filter((m) => m.risk === "alto" || m.risk === "critico")
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );
}

export function getUpcomingMatters(days = 14): Matter[] {
  return getActiveMatters()
    .filter((m) => isWithinDays(m.deadline, days) || isOverdue(m.deadline))
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );
}

export interface UpcomingContact {
  id: string;
  entityType: "lead" | "oportunidade";
  name: string;
  accountOrLead: string;
  date: string;
  owner: string;
  channel: string;
}

export function getUpcomingContacts(days = 14): UpcomingContact[] {
  const fromLeads: UpcomingContact[] = getActiveLeads()
    .filter((l) => l.nextContact && isWithinDays(l.nextContact, days))
    .map((l) => ({
      id: l.id,
      entityType: "lead" as const,
      name: "Contato comercial",
      accountOrLead: l.name,
      date: l.nextContact!,
      owner: l.owner,
      channel: "Reunião / call",
    }));

  const fromOpps: UpcomingContact[] = getOpenOpportunities()
    .filter((o) => o.nextContact && isWithinDays(o.nextContact, days))
    .map((o) => ({
      id: o.id,
      entityType: "oportunidade" as const,
      name: "Follow-up negocial",
      accountOrLead: o.accountName,
      date: o.nextContact!,
      owner: o.owner,
      channel: "Proposta / alinhamento",
    }));

  return [...fromLeads, ...fromOpps].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function formatPipelineValue(value: number) {
  return formatBrl(value);
}