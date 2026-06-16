import type {
  CopilotContextEntity,
  CopilotPrompt,
  CopilotQueryRequest,
  CopilotRelatedEntity,
  CopilotResponse,
  CopilotSource,
  CrmStats,
} from "./types.js";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_DOCUMENTS,
  getKnowledgeCategory,
} from "./knowledge.js";

export const COPILOT_DISCLAIMER =
  "Resposta simulada nesta versão — validar com responsável jurídico.";

export const COPILOT_LEGAL_NOTICE =
  "O Copilot apoia análise interna e não substitui revisão jurídica. Respostas devem ser validadas por responsável técnico.";

export const COPILOT_KNOWLEDGE_NOTICE =
  "Base de conhecimento usa documentos internos e dados fictícios nesta versão.";

export const COPILOT_PROMPTS: CopilotPrompt[] = [
  {
    id: "risks-today",
    label: "Riscos imediatos",
    text: "Quais riscos exigem ação hoje?",
  },
  {
    id: "week-summary",
    label: "Resumo executivo",
    text: "Gere um resumo executivo da semana.",
  },
  {
    id: "stalled-opps",
    label: "Pipeline parado",
    text: "Quais oportunidades estão paradas?",
  },
  {
    id: "rural-docs",
    label: "Regularização rural",
    text: "Que documentos pedir para regularização rural?",
  },
  {
    id: "succession-meeting",
    label: "Sucessão rural",
    text: "Como preparar reunião sobre sucessão rural?",
  },
  {
    id: "environmental",
    label: "Demandas ambientais",
    text: "Quais demandas ambientais precisam de atenção?",
  },
  {
    id: "lead-suggestions",
    label: "Sugerir leads",
    text: "Analise os dados do CRM e sugira novos leads ou abordagens para prospectação baseadas em padrões de sucesso e oportunidades identificadas.",
  },
  {
    id: "execucao-ccb",
    label: "Defesa em execução de CCB",
    text: "Como defender produtor rural em execução de CCB com alienação fiduciária?",
  },
  {
    id: "embargos-cpr",
    label: "Embargos à execução de CPR",
    text: "Quais argumentos usar em embargos à execução de CPR?",
  },
  {
    id: "impenhorabilidade",
    label: "Impenhorabilidade da pequena propriedade",
    text: "A pequena propriedade rural é impenhorável após o REsp 2.233.886?",
  },
  {
    id: "recuperacao-rural",
    label: "Recuperação judicial do produtor rural",
    text: "Produtor rural pode ingressar em recuperação judicial?",
  },
  {
    id: "revisional-credito",
    label: "Revisional de contrato de crédito rural",
    text: "Como analisar revisional de contrato de crédito rural?",
  },
  {
    id: "penhor-prioridade",
    label: "Penhor rural e conflitos de prioridade",
    text: "Como resolver conflito de prioridade entre penhor rural e CPR?",
  },
];

function normalizeQuery(query: string) {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function matchPromptId(query: string): string | null {
  const q = normalizeQuery(query);
  if (q.includes("risco") && (q.includes("hoje") || q.includes("acao") || q.includes("ação"))) {
    return "risks-today";
  }
  if (q.includes("resumo") && q.includes("semana")) return "week-summary";
  if (q.includes("executivo") && q.includes("semana")) return "week-summary";
  if (q.includes("oportunidade") && (q.includes("parad") || q.includes("estagn"))) {
    return "stalled-opps";
  }
  if (q.includes("documento") && q.includes("regulariz")) return "rural-docs";
  if (q.includes("reuniao") || q.includes("reunião")) {
    if (q.includes("sucess")) return "succession-meeting";
  }
  if (q.includes("sucess")) return "succession-meeting";
  if (q.includes("ambiental") || q.includes("licenciamento")) return "environmental";
  if (
    q.includes("ccb") ||
    (q.includes("execuca") && q.includes("bancar")) ||
    (q.includes("cedula") && q.includes("bancar"))
  ) {
    return "execucao-ccb";
  }
  if (
    q.includes("cpr") &&
    (q.includes("embarg") || q.includes("execuca") || q.includes("argumento"))
  ) {
    return "embargos-cpr";
  }
  if (
    q.includes("impenhorab") ||
    q.includes("pequena propriedade") ||
    q.includes("resp 2.233.886")
  ) {
    return "impenhorabilidade";
  }
  if (
    (q.includes("recuperacao") || q.includes("recuperação")) &&
    (q.includes("judicial") || q.includes("produtor rural"))
  ) {
    return "recuperacao-rural";
  }
  if (
    q.includes("revisional") &&
    (q.includes("credito") || q.includes("crédito") || q.includes("rural"))
  ) {
    return "revisional-credito";
  }
  if (
    q.includes("penhor") ||
    (q.includes("cpr") && q.includes("prioridade")) ||
    q.includes("conflito de prioridade")
  ) {
    return "penhor-prioridade";
  }
  return null;
}

function toSources(documentIds: string[]): CopilotSource[] {
  return documentIds
    .map((documentId) => {
      const doc = KNOWLEDGE_DOCUMENTS.find((d) => d.id === documentId);
      if (!doc) return null;
      const category = getKnowledgeCategory(doc.categoryId);
      return {
        id: `src-${doc.id}`,
        documentId: doc.id,
        title: doc.title,
        excerpt: doc.summary,
        categoryLabel: category?.label ?? doc.categoryId,
      };
    })
    .filter((s): s is CopilotSource => s !== null);
}

function matterEntities(matters: CrmStats["riskAlerts"]): CopilotRelatedEntity[] {
  return matters.slice(0, 4).map((m) => ({
    id: m.id,
    type: "demanda" as const,
    name: m.title,
  }));
}

function oppEntities(opps: CrmStats["priorityOpportunities"]): CopilotRelatedEntity[] {
  return opps.slice(0, 3).map((o) => ({
    id: o.id,
    type: "oportunidade" as const,
    name: o.title,
  }));
}

function withContextNote(
  synthesis: string,
  context?: CopilotContextEntity | null,
) {
  if (!context) return synthesis;
  return `${synthesis} Contexto vinculado: ${context.name} (${context.type}).`;
}

function buildResponse(
  query: string,
  promptId: string | null,
  synthesis: string,
  risks: string[],
  nextSteps: string[],
  sourceIds: string[],
  relatedEntities: CopilotRelatedEntity[],
  context?: CopilotContextEntity | null,
): CopilotResponse {
  return {
    id: `cop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    promptId,
    query,
    synthesis: withContextNote(synthesis, context),
    risks,
    nextSteps,
    sources: toSources(sourceIds),
    relatedEntities,
    simulated: true,
    disclaimer: COPILOT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Motor determinístico do Agro Copilot (mock).
 * Futuro: substituir por POST /api/agro/copilot/query com LLM + RAG.
 */
export function resolveCopilotQuery(
  input: CopilotQueryRequest,
  stats?: CrmStats,
): CopilotResponse {
  const { query, contextEntity } = input;
  const promptId = matchPromptId(query);
  const s = stats;

  if (promptId === "risks-today" && s) {
    const critical = [...s.riskAlerts, ...s.upcomingMatters.filter(
      (m) => m.risk === "alto" || m.risk === "critico",
    )];
    return buildResponse(
      query,
      promptId,
      `Há atenção concentrada em ${critical.length} frentes com risco elevado ou prazo próximo. Recomenda-se priorizar demandas críticas antes de avançar oportunidades comerciais de alto valor. ${s.overdueTasks} tarefa(s) vencida(s) reforçam a necessidade de triagem imediata.`,
      [
        `${critical.length} demandas com risco alto ou crítico na carteira`,
        `${s.overdueTasks} tarefas vencidas impactam follow-up comercial e jurídico`,
        "Concentração em ambiental e contencioso nas próximas 48–72h",
      ],
      [
        "Revisar demandas com badge CRÍTICO e prazos em até 48h",
        "Acionar responsáveis por tarefas vencidas",
        "Registrar decisão de priorização no CRM antes de novas propostas",
      ],
      ["KB-007", "KB-009", "KB-013"],
      matterEntities(critical),
      contextEntity,
    );
  }

  if (promptId === "week-summary" && s) {
    return buildResponse(
      query,
      promptId,
      `Na semana corrente, a carteira Agro apresenta ${s.openOpportunities} oportunidades em aberto, ${s.activeMatters} demandas ativas e ${s.upcomingContacts.length} contatos agendados na quinzena. O pipeline soma valor relevante em operações societárias, com atenção a prazos ambientais e contencioso.`,
      [
        "Prazos críticos podem competir com janelas comerciais",
        "Pipeline concentrado em fases intermediárias",
      ],
      [
        "Consolidar resumo em reunião de gestão",
        "Validar priorização de contatos da quinzena",
        "Revisar oportunidades em negociação avançada",
      ],
      ["KB-016", "KB-017"],
      [
        ...oppEntities(s.priorityOpportunities),
        ...matterEntities(s.riskAlerts),
      ],
      contextEntity,
    );
  }

  if (promptId === "stalled-opps" && s) {
    const stalled = s.pipelineByStage.filter(
      (stage) =>
        stage.count > 0 &&
        ["diagnostico_realizado", "proposta_elaboracao", "proposta_enviada"].includes(
          stage.id,
        ),
    );
    const stalledCount = stalled.reduce((sum, st) => sum + st.count, 0);
    return buildResponse(
      query,
      promptId,
      `${stalledCount} oportunidade(s) permanecem em fases intermediárias sem avanço recente. Sugere-se contato de follow-up e revisão de proposta antes de novas entradas no pipeline.`,
      [
        "Estagnação em proposta e diagnóstico reduz previsibilidade de receita",
        "Oportunidades de alto valor sem próximo contato agendado",
      ],
      [
        "Listar oportunidades sem contato nos últimos 14 dias",
        "Definir próximo passo comercial por oportunidade",
        "Avaliar necessidade de parecer jurídico antes de nova proposta",
      ],
      ["KB-016", "KB-014"],
      oppEntities(s.priorityOpportunities),
      contextEntity,
    );
  }

  if (promptId === "rural-docs") {
    return buildResponse(
      query,
      promptId,
      "Para regularização rural, solicite matrícula atualizada, CCIR, ITR, CAR, memorial descritivo e documentos de origem da área. Em retificações, inclua plantas georreferenciadas e certidões negativas pertinentes.",
      [
        "Lacunas documentais atrasam registro e financiamentos",
        "Divergência de área entre CAR e matrícula gera risco futuro",
      ],
      [
        "Enviar checklist KB-005 ao cliente",
        "Agendar diagnóstico documental com equipe técnica",
        "Abrir demanda de regularização no CRM se ainda não existir",
      ],
      ["KB-005", "KB-006", "KB-018"],
      [],
      contextEntity,
    );
  }

  if (promptId === "succession-meeting") {
    return buildResponse(
      query,
      promptId,
      "Para reunião de sucessão rural, prepare pauta com patrimônio rural, estrutura societária atual, perfil das gerações, objetivos de liquidez e governança. Leve modelo de acordo de quotistas e lista de documentos patrimoniais.",
      [
        "Conflitos familiares não mapeados podem inviabilizar estrutura",
        "Ausência de balanços patrimoniais dificulta proposta",
      ],
      [
        "Usar guia KB-010 como roteiro da reunião",
        "Coletar balanços e contratos de arrendamento vigentes",
        "Registrar próximos passos e responsáveis no CRM",
      ],
      ["KB-010", "KB-011", "KB-003"],
      [{ id: "MT-304", type: "demanda", name: "Holding familiar e sucessão patrimonial" }],
      contextEntity,
    );
  }

  if (promptId === "environmental" && s) {
    const envMatters = [
      ...s.riskAlerts,
      ...s.upcomingMatters,
    ].filter((m) =>
      m.practice.toLowerCase().includes("ambiental") ||
      m.title.toLowerCase().includes("licenciamento") ||
      m.title.toLowerCase().includes("embargo"),
    );
    return buildResponse(
      query,
      promptId,
      `Há atenção concentrada em demandas ambientais e prazos próximos. ${envMatters.length} frente(s) ambiental(is) exigem revisão de condicionantes, defesa administrativa ou licenciamento operacional.`,
      [
        "Condicionantes com vencimento iminente",
        "Risco de embargo e impacto em operação de armazenagem",
      ],
      [
        "Priorizar protocolo de atendimento a condicionantes",
        "Validar ART e relatórios técnicos pendentes",
        "Alinhar comunicação com cliente sobre prazos fatais",
      ],
      ["KB-007", "KB-008", "KB-009"],
      matterEntities(envMatters.length ? envMatters : s.riskAlerts),
      contextEntity,
    );
  }

  if (promptId === "execucao-ccb") {
    return buildResponse(
      query,
      promptId,
      "A defesa em execução de CCB com alienação fiduciária exige verificação da validade da cédula, regularidade da garantia, citação, possíveis vícios de liquidez e exequibilidade do título. A análise deve ser caso a caso, considerando a documentação contratual e os precedentes aplicáveis.",
      [
        "Título sem constituição formal regular pode ser impugnado",
        "Bem alienado fiduciariamente pode acelerar busca e apreensão",
        "Prazos processuais são fatais na execução",
      ],
      [
        "Reunir CCB, contrato de crédito e registro de garantia",
        "Verificar existência de coisa julgada ou preclusão",
        "Submeter análise a responsável jurídico antes de protocolar impugnação",
      ],
      ["KB-019", "KB-023"],
      [],
      contextEntity,
    );
  }

  if (promptId === "embargos-cpr") {
    return buildResponse(
      query,
      promptId,
      "Os embargos à execução de CPR podem versar sobre nulidade do título, excesso de execução, duplicidade de cobrança, falta de registro e vícios na constituição da obrigação. O prazo e a competência devem ser observados conforme o caso concreto.",
      [
        "Perda de prazo para embargos pode gerar irreversibilidade",
        "Falta de registro ou irregularidade na CPR reduz defesa",
        "Cobrança sobre valor não efetivamente liberado é passível de impugnação",
      ],
      [
        "Verificar data da citação e prazo de embargos",
        "Conferir valor executado com contrato e liquidação",
        "Elaborar impugnação com base em KB-020",
      ],
      ["KB-020", "KB-001", "KB-002"],
      [],
      contextEntity,
    );
  }

  if (promptId === "impenhorabilidade") {
    return buildResponse(
      query,
      promptId,
      "A impenhorabilidade da pequena propriedade rural depende do atendimento a requisitos objetivos e subjetivos, especialmente área, renda familiar predominante e função social, conforme entendimento consolidado no STJ. Cada caso exige análise dos documentos e da situação familiar do produtor.",
      [
        "Não atendimento dos requisitos legais afasta a impenhorabilidade",
        "Interpretação local pode variar até trânsito em julgado",
        "Levantamento incompleto da renda familiar compromete a alegação",
      ],
      [
        "Levantar documentos de área, renda e composição familiar",
        "Analisar aplicabilidade do entendimento do REsp 2.233.886",
        "Preparar sustentação com respaldo em KB-021",
      ],
      ["KB-021"],
      [],
      contextEntity,
    );
  }

  if (promptId === "recuperacao-rural") {
    return buildResponse(
      query,
      promptId,
      "O produtor rural pode ser elegível à recuperação judicial se preencher os requisitos do regime, em especial a regularidade do empresário rural, o número de credores e o montante do passivo. O plano deve considerar a sazonalidade da atividade e a viabilidade econômica da propriedade.",
      [
        "Fraude à execução ou dissociação patrimonial pode indeferir o pedido",
        "Inadimplência recorrente pode afetar viabilidade do plano",
        "Prazo de apresentação do plano é crítico",
      ],
      [
        "Avaliar elegibilidade e passivo consolidado",
        "Estruturar plano compatível com calendário agrícola",
        "Submeter proposta à equipe especializada antes do protocolo",
      ],
      ["KB-022"],
      [],
      contextEntity,
    );
  }

  if (promptId === "revisional-credito") {
    return buildResponse(
      query,
      promptId,
      "A análise revisional de contrato de crédito rural examina cláusulas de juros, indexadores, correção monetária, amortização e eventuais abusividades, considerando as regras do CDC e do crédito rural. A viabilidade e o impacto dependem de cada contrato.",
      [
        "Indexadores incompatíveis com a legislação podem gerar restituição",
        "Cláusulas de penalidade podem comprometer fluxo de caixa",
        "Prazo prescricional é um fator limitador",
      ],
      [
        "Revisar contrato, extratos e histórico de amortização",
        "Mapear cláusulas potencialmente abusivas",
        "Submeter parecer a responsável jurídico para definição de estratégia",
      ],
      ["KB-023", "KB-002"],
      [],
      contextEntity,
    );
  }

  if (promptId === "penhor-prioridade") {
    return buildResponse(
      query,
      promptId,
      "Conflitos de prioridade entre penhor rural e CPR exigem análise cronológica das garantias, registro em cartório, publicidade e boa-fé. A solução depende da verificação documental e da ordem de constituição das garantias, com atenção às hipóteses de preferência legal.",
      [
        "Registro posterior ou defeituoso pode perder prioridade",
        "Conflitos com garantias anteriores reduzem segurança do crédito",
        "Ausência de busca de ônus anteriores gera surpresa",
      ],
      [
        "Levantar registros e data de constituição das garantias",
        "Conferir publicidade e ordem cronológica",
        "Consultar KB-001 e KB-002 para estruturação",
      ],
      ["KB-001", "KB-002", "KB-020"],
      [],
      contextEntity,
    );
  }

  // Fallback genérico
  const categoryCount = KNOWLEDGE_CATEGORIES.length;
  return buildResponse(
    query,
    null,
    s
      ? `Com base na carteira atual (${s.activeMatters} demandas, ${s.openOpportunities} oportunidades), recomenda-se cruzar a pergunta com prazos críticos e pipeline comercial. Esta resposta é simulada — refine a consulta ou use um dos prompts sugeridos.`
      : `Análise preliminar simulada. A base de conhecimento Agro conta com ${categoryCount} categorias para apoiar sua consulta. Refine a pergunta ou selecione um prompt sugerido.`,
    ["Resposta não validada juridicamente nesta versão"],
    [
      "Reformular pergunta com área jurídica específica",
      "Consultar Base de Conhecimento Agro",
      "Validar conclusão com responsável técnico",
    ],
    ["KB-017"],
    s ? matterEntities(s.riskAlerts) : [],
    contextEntity,
  );
}