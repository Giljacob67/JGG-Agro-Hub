import type { CrmStats } from "@shared/agro/types";
import { formatBrl, isCriticalDeadline, isWithinDays } from "@/lib/crm-labels";

export type InsightSeverity = "neutral" | "attention" | "critical";
export type OperationalStatus = "estavel" | "atencao" | "critico";

export interface ExecutiveInsight {
  id: string;
  title: string;
  detail: string;
  severity: InsightSeverity;
}

export interface IntelligenceCardData {
  id: string;
  title: string;
  metric: string;
  detail: string;
  severity?: InsightSeverity;
}

function countCriticalDeadlines(stats: CrmStats) {
  const matterDeadlines = stats.upcomingMatters.filter((m) =>
    isCriticalDeadline(m.deadline, m.risk, m.status),
  ).length;
  const overdue = stats.overdueTasks;
  const urgentTasks = stats.upcomingTasksList.filter(
    (t) => isWithinDays(t.dueDate, 2) || t.priority === "urgente",
  ).length;
  return matterDeadlines + overdue + urgentTasks;
}

function countDueWithin48h(stats: CrmStats) {
  const matters = stats.upcomingMatters.filter((m) =>
    isWithinDays(m.deadline, 2),
  ).length;
  const tasks = [...stats.overdueTasksList, ...stats.upcomingTasksList].filter(
    (t) => isWithinDays(t.dueDate, 2) || t.status === "atrasada",
  ).length;
  return matters + tasks;
}

function topPractice(stats: CrmStats) {
  return [...stats.practiceBreakdown].sort(
    (a, b) => b.pipelineValue - a.pipelineValue,
  )[0];
}

function negotiationValue(stats: CrmStats) {
  return stats.priorityOpportunities
    .filter((o) => o.stage === "negociacao" || o.stage === "proposta_enviada")
    .reduce((sum, o) => sum + o.valueBrl, 0);
}

function highRiskMatters(stats: CrmStats) {
  return stats.riskAlerts.filter(
    (m) => m.risk === "alto" || m.risk === "critico",
  ).length;
}

function pipelineBottleneck(stats: CrmStats) {
  const openStages = stats.pipelineByStage.filter((s) => s.count > 0);
  return [...openStages].sort((a, b) => b.count - a.count)[0];
}

export function getOperationalStatus(stats: CrmStats): OperationalStatus {
  const critical = countCriticalDeadlines(stats);
  if (critical >= 4 || stats.overdueTasks >= 2) return "critico";
  if (critical >= 2 || stats.riskAlerts.length >= 2) return "atencao";
  return "estavel";
}

export function buildWeekSummary(stats: CrmStats): string {
  const closed = formatBrl(stats.closedValue);
  const pipeline = formatBrl(stats.pipelineValue);
  const contacts = stats.upcomingContacts.length;
  return `${stats.openOpportunities} oportunidades em aberto (${pipeline}), ${stats.activeMatters} demandas ativas, ${contacts} contatos agendados na próxima quinzena e ${closed} já contratados.`;
}

export function buildExecutiveInsights(stats: CrmStats): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];
  const practice = topPractice(stats);
  const due48h = countDueWithin48h(stats);
  const negValue = negotiationValue(stats);

  if (due48h > 0) {
    insights.push({
      id: "deadlines",
      title: "Prazos iminentes",
      detail: `${due48h} prazo${due48h > 1 ? "s" : ""} crítico${due48h > 1 ? "s" : ""} nas próximas 48 horas`,
      severity: due48h >= 2 ? "critical" : "attention",
    });
  }

  if (practice) {
    insights.push({
      id: "pipeline",
      title: "Concentração de pipeline",
      detail: `Maior volume em ${practice.practice} (${formatBrl(practice.pipelineValue)})`,
      severity: "neutral",
    });
  }

  if (negValue > 0) {
    insights.push({
      id: "negotiation",
      title: "Negociação ativa",
      detail: `${formatBrl(negValue)} em propostas e negociação avançada`,
      severity: "attention",
    });
  }

  if (highRiskMatters(stats) > 0) {
    insights.push({
      id: "risk",
      title: "Risco jurídico",
      detail: `${highRiskMatters(stats)} demanda${highRiskMatters(stats) > 1 ? "s" : ""} com risco alto ou crítico`,
      severity: "critical",
    });
  }

  if (insights.length < 3 && stats.qualifiedLeads > 0) {
    insights.push({
      id: "leads",
      title: "Qualificação comercial",
      detail: `${stats.qualifiedLeads} leads qualificados na base ativa`,
      severity: "neutral",
    });
  }

  return insights.slice(0, 3);
}

export function buildStrategicKpis(stats: CrmStats) {
  const practice = topPractice(stats);
  const due48h = countDueWithin48h(stats);
  const criticalCount = countCriticalDeadlines(stats);
  const negValue = negotiationValue(stats);
  const highRisk = highRiskMatters(stats);

  return [
    {
      id: "pipeline",
      label: "Pipeline aberto",
      value: formatBrl(stats.pipelineValue),
      context: practice
        ? `Maior concentração em ${practice.practice.toLowerCase()}`
        : "Distribuído entre áreas de atuação",
      observation: `${stats.openOpportunities} oportunidades ativas`,
      severity: "neutral" as InsightSeverity,
      highlight: true,
    },
    {
      id: "deadlines",
      label: "Prazos críticos",
      value: criticalCount,
      context:
        due48h > 0
          ? `${due48h} vencem em até 48h`
          : "Nenhum vencimento iminente",
      observation: `${stats.overdueTasks} tarefa${stats.overdueTasks !== 1 ? "s" : ""} vencida${stats.overdueTasks !== 1 ? "s" : ""}`,
      severity: (criticalCount >= 3
        ? "critical"
        : criticalCount > 0
          ? "attention"
          : "neutral") as InsightSeverity,
      highlight: criticalCount > 0,
    },
    {
      id: "priority-opps",
      label: "Oportunidades prioritárias",
      value: stats.priorityOpportunities.length,
      context:
        negValue > 0
          ? `${formatBrl(negValue)} em negociação`
          : "Aguardando avanço comercial",
      observation: "Alta prioridade ou alto valor",
      severity: "attention" as InsightSeverity,
    },
    {
      id: "matters",
      label: "Demandas ativas",
      value: stats.activeMatters,
      context:
        highRisk > 0
          ? `${highRisk} com risco alto ou crítico`
          : "Carteira jurídica estável",
      observation: `${stats.riskAlerts.length} alerta${stats.riskAlerts.length !== 1 ? "s" : ""} de risco`,
      severity: (highRisk >= 2 ? "critical" : highRisk > 0 ? "attention" : "neutral") as InsightSeverity,
    },
  ];
}

export function buildIntelligenceCards(stats: CrmStats): IntelligenceCardData[] {
  const bottleneck = pipelineBottleneck(stats);
  const topRiskPractice = [...stats.practiceBreakdown]
    .sort((a, b) => b.matters - a.matters)
    .find((p) => p.matters > 0);
  const highImpact = stats.priorityOpportunities[0];
  const commercialRisk = stats.riskAlerts.find(
    (m) => m.risk === "critico" || m.risk === "alto",
  );
  const contactsGap = Math.max(
    0,
    stats.activeLeads - stats.upcomingContacts.filter((c) => c.entityType === "lead").length,
  );

  return [
    {
      id: "bottleneck",
      title: "Gargalos do pipeline",
      metric: bottleneck ? `${bottleneck.count} em ${bottleneck.label.toLowerCase()}` : "—",
      detail: bottleneck
        ? `${formatBrl(bottleneck.value)} concentrados nesta fase`
        : "Pipeline equilibrado entre fases",
      severity: bottleneck && bottleneck.count >= 2 ? "attention" : "neutral",
    },
    {
      id: "legal-risk",
      title: "Riscos por área jurídica",
      metric: topRiskPractice
        ? `${topRiskPractice.matters} demandas`
        : "Sem demandas",
      detail: topRiskPractice
        ? `Maior volume em ${topRiskPractice.practice}`
        : "Carteira jurídica distribuída",
      severity:
        topRiskPractice && topRiskPractice.matters >= 3 ? "attention" : "neutral",
    },
    {
      id: "contact-gap",
      title: "Clientes sem próximo contato",
      metric: `${contactsGap} lead${contactsGap !== 1 ? "s" : ""}`,
      detail:
        contactsGap > 0
          ? "Sem follow-up agendado na próxima quinzena"
          : "Follow-up comercial em dia",
      severity: contactsGap >= 3 ? "attention" : "neutral",
    },
    {
      id: "high-impact",
      title: "Oportunidades com maior impacto",
      metric: highImpact ? formatBrl(highImpact.valueBrl) : "—",
      detail: highImpact
        ? `${highImpact.accountName} · ${highImpact.practice}`
        : "Nenhuma oportunidade prioritária",
      severity: highImpact?.priority === "alta" ? "attention" : "neutral",
    },
    {
      id: "commercial-risk",
      title: "Demandas com risco comercial",
      metric: commercialRisk ? "Alto risco" : "Controlado",
      detail: commercialRisk
        ? commercialRisk.title
        : "Nenhuma demanda crítica comercial identificada",
      severity: commercialRisk ? "critical" : "neutral",
    },
  ];
}

export function getCriticalOperationCount(stats: CrmStats) {
  return countCriticalDeadlines(stats);
}