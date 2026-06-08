import { isOverdue, isWithinDays } from "./date-utils";
import { OPPORTUNITY_STAGES } from "./seed";
import {
  listLeads,
  listMatters,
  listOpportunities,
  listTasks,
} from "./store";
import type { CrmStats, Matter, Opportunity, Task } from "./types";

const OPEN_STAGES = new Set(["qualificacao", "proposta", "negociacao"]);

function getActiveLeads() {
  return listLeads().filter((l) => l.status !== "descartado");
}

function getOpenOpportunities() {
  return listOpportunities().filter(
    (o) => o.stage !== "perdido" && o.stage !== "contrato",
  );
}

function getActiveMatters() {
  return listMatters().filter((m) => m.status !== "concluida");
}

function getOpenTasks() {
  return listTasks().filter((t) => t.status !== "concluida");
}

function getOverdueTasks() {
  return getOpenTasks().filter(
    (t) => t.status === "atrasada" || isOverdue(t.dueDate),
  );
}

function getUpcomingTasks(days = 7) {
  return getOpenTasks().filter(
    (t) => !isOverdue(t.dueDate) && isWithinDays(t.dueDate, days),
  );
}

function getPipelineByStage() {
  const opportunities = listOpportunities();
  return OPPORTUNITY_STAGES.filter((s) => s.id !== "perdido").map((stage) => {
    const items = opportunities.filter((o) => o.stage === stage.id);
    return {
      ...stage,
      count: items.length,
      value: items.reduce((s, o) => s + o.valueBrl, 0),
    };
  });
}

function getPriorityOpportunities(): Opportunity[] {
  return getOpenOpportunities()
    .filter((o) => o.priority === "alta" || OPEN_STAGES.has(o.stage))
    .sort((a, b) => b.valueBrl - a.valueBrl)
    .slice(0, 5);
}

function getRiskAlerts(): Matter[] {
  return getActiveMatters()
    .filter((m) => m.risk === "alto" || m.risk === "critico")
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );
}

function getUpcomingMatters(days = 14): Matter[] {
  return getActiveMatters()
    .filter((m) => isWithinDays(m.deadline, days) || isOverdue(m.deadline))
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );
}

function getUpcomingContacts(days = 14) {
  const fromLeads = getActiveLeads()
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

  const fromOpps = getOpenOpportunities()
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

export function computeCrmStats(): CrmStats {
  const openOpportunities = getOpenOpportunities();
  const overdueTasks = getOverdueTasks();
  const upcomingTasks = getUpcomingTasks(7);

  return {
    activeLeads: getActiveLeads().length,
    openOpportunities: openOpportunities.length,
    pipelineValue: openOpportunities.reduce((s, o) => s + o.valueBrl, 0),
    activeMatters: getActiveMatters().length,
    overdueTasks: overdueTasks.length,
    upcomingTasks: upcomingTasks.length,
    pipelineByStage: getPipelineByStage(),
    priorityOpportunities: getPriorityOpportunities(),
    riskAlerts: getRiskAlerts(),
    upcomingMatters: getUpcomingMatters(14),
    upcomingContacts: getUpcomingContacts(14),
    overdueTasksList: overdueTasks,
    upcomingTasksList: upcomingTasks,
  };
}

export function getOverdueTasksList(): Task[] {
  return getOverdueTasks();
}