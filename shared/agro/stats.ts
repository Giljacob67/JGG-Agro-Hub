import { isOverdue, isWithinDays } from "./date-utils.js";
import { OPPORTUNITY_STAGES } from "./seed.js";
import {
  listLeads,
  listMatters,
  listOpportunities,
  listTasks,
} from "./store.js";
import type { CrmStats, Lead, Matter, Opportunity, Task } from "./types.js";

const OPEN_STAGES = new Set(["qualificacao", "proposta", "negociacao"]);

export interface CrmDataset {
  leads: Lead[];
  opportunities: Opportunity[];
  matters: Matter[];
  tasks: Task[];
}

function resolveDataset(dataset?: CrmDataset): CrmDataset {
  if (dataset) return dataset;
  return {
    leads: listLeads(),
    opportunities: listOpportunities(),
    matters: listMatters(),
    tasks: listTasks(),
  };
}

function getActiveLeads(leads: Lead[]) {
  return leads.filter((l) => l.status !== "descartado");
}

function getOpenOpportunities(opportunities: Opportunity[]) {
  return opportunities.filter(
    (o) => o.stage !== "perdido" && o.stage !== "contrato",
  );
}

function getActiveMatters(matters: Matter[]) {
  return matters.filter((m) => m.status !== "concluida");
}

function getOpenTasks(tasks: Task[]) {
  return tasks.filter((t) => t.status !== "concluida");
}

function getOverdueTasks(tasks: Task[]) {
  return getOpenTasks(tasks).filter(
    (t) => t.status === "atrasada" || isOverdue(t.dueDate),
  );
}

function getUpcomingTasks(tasks: Task[], days = 7) {
  return getOpenTasks(tasks).filter(
    (t) => !isOverdue(t.dueDate) && isWithinDays(t.dueDate, days),
  );
}

function getPipelineByStage(opportunities: Opportunity[]) {
  return OPPORTUNITY_STAGES.filter((s) => s.id !== "perdido").map((stage) => {
    const items = opportunities.filter((o) => o.stage === stage.id);
    return {
      ...stage,
      count: items.length,
      value: items.reduce((s, o) => s + o.valueBrl, 0),
    };
  });
}

function getPriorityOpportunities(opportunities: Opportunity[]) {
  return getOpenOpportunities(opportunities)
    .filter((o) => o.priority === "alta" || OPEN_STAGES.has(o.stage))
    .sort((a, b) => b.valueBrl - a.valueBrl)
    .slice(0, 5);
}

function getRiskAlerts(matters: Matter[]) {
  return getActiveMatters(matters)
    .filter((m) => m.risk === "alto" || m.risk === "critico")
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );
}

function getUpcomingMatters(matters: Matter[], days = 14) {
  return getActiveMatters(matters)
    .filter((m) => isWithinDays(m.deadline, days) || isOverdue(m.deadline))
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );
}

function getUpcomingContacts(leads: Lead[], opportunities: Opportunity[], days = 14) {
  const fromLeads = getActiveLeads(leads)
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

  const fromOpps = getOpenOpportunities(opportunities)
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

export function computeCrmStats(dataset?: CrmDataset): CrmStats {
  const data = resolveDataset(dataset);
  const openOpportunities = getOpenOpportunities(data.opportunities);
  const overdueTasks = getOverdueTasks(data.tasks);
  const upcomingTasks = getUpcomingTasks(data.tasks, 7);

  return {
    activeLeads: getActiveLeads(data.leads).length,
    openOpportunities: openOpportunities.length,
    pipelineValue: openOpportunities.reduce((s, o) => s + o.valueBrl, 0),
    activeMatters: getActiveMatters(data.matters).length,
    overdueTasks: overdueTasks.length,
    upcomingTasks: upcomingTasks.length,
    pipelineByStage: getPipelineByStage(data.opportunities),
    priorityOpportunities: getPriorityOpportunities(data.opportunities),
    riskAlerts: getRiskAlerts(data.matters),
    upcomingMatters: getUpcomingMatters(data.matters, 14),
    upcomingContacts: getUpcomingContacts(data.leads, data.opportunities, 14),
    overdueTasksList: overdueTasks,
    upcomingTasksList: upcomingTasks,
  };
}