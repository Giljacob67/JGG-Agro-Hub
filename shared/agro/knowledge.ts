import type {
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeListResponse,
} from "./types.js";

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  {
    id: "credito-cpr",
    label: "Crédito rural e CPR",
    description: "Garantias, penhor, registros e estruturação de financiamentos.",
  },
  {
    id: "contratos-agrarios",
    label: "Contratos agrários",
    description: "Arrendamento, parceria, compra e venda de safra e cláusulas essenciais.",
  },
  {
    id: "regularizacao",
    label: "Regularização de imóveis rurais",
    description: "CAR, georreferenciamento, matrícula e consolidação documental.",
  },
  {
    id: "ambiental",
    label: "Ambiental e compliance rural",
    description: "Licenciamento, APP, reserva legal e defesa administrativa.",
  },
  {
    id: "sucessao",
    label: "Planejamento patrimonial e sucessório",
    description: "Holding familiar, doação, usufruto e governança intergeracional.",
  },
  {
    id: "tributario",
    label: "Tributário aplicado ao agro",
    description: "Incentivos, exportação, estruturação societária e riscos fiscais.",
  },
  {
    id: "contencioso",
    label: "Contencioso rural",
    description: "Disputas de posse, reintegração, embargos e estratégia processual.",
  },
  {
    id: "societario",
    label: "Operações societárias",
    description: "Reorganizações, incorporações, quotistas e due diligence.",
  },
  {
    id: "contencioso-bancario-rural",
    label: "Contencioso bancário-rural",
    description: "Defesa do produtor rural e reestruturação de dívidas agro.",
  },
  {
    id: "modelos",
    label: "Modelos e checklists",
    description: "Templates internos, roteiros de reunião e listas de documentos.",
  },
];

export const KNOWLEDGE_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: "KB-001",
    categoryId: "credito-cpr",
    title: "Checklist de documentação para CPR e penhor rural",
    summary:
      "Lista mínima de documentos para estruturar CPR com garantia real e registro em cartório.",
    tags: ["CPR", "penhor", "garantias"],
    updatedAt: "2026-05-28",
    type: "checklist",
    status: "publicado",
  },
  {
    id: "KB-002",
    categoryId: "credito-cpr",
    title: "Guia de análise de garantias em operações de crédito rural",
    summary:
      "Critérios para avaliar penhor, alienação fiduciária e avaliação de ativos rurais.",
    tags: ["crédito rural", "garantias"],
    updatedAt: "2026-05-15",
    type: "guia",
    status: "publicado",
  },
  {
    id: "KB-003",
    categoryId: "contratos-agrarios",
    title: "Cláusulas essenciais em contrato de arrendamento rural",
    summary:
      "Pontos de atenção em prazo, destinação da área, benfeitorias e rescisão.",
    tags: ["arrendamento", "contratos"],
    updatedAt: "2026-04-20",
    type: "guia",
    status: "publicado",
  },
  {
    id: "KB-004",
    categoryId: "contratos-agrarios",
    title: "Modelo de minuta — parceria agrícola",
    summary: "Template interno para parceria com rateio de custos e produção.",
    tags: ["parceria", "modelo"],
    updatedAt: "2026-03-10",
    type: "modelo",
    status: "em_revisao",
  },
  {
    id: "KB-005",
    categoryId: "regularizacao",
    title: "Documentos para regularização fundiária rural",
    summary:
      "Matrícula, CCIR, ITR, CAR, memorial descritivo e retificações comuns.",
    tags: ["CAR", "matrícula", "regularização"],
    updatedAt: "2026-06-01",
    type: "checklist",
    status: "publicado",
  },
  {
    id: "KB-006",
    categoryId: "regularizacao",
    title: "FAQ — georreferenciamento e retificação de área",
    summary: "Perguntas frequentes sobre prazos, custos e riscos de retificação.",
    tags: ["georreferenciamento", "FAQ"],
    updatedAt: "2026-05-22",
    type: "faq",
    status: "publicado",
  },
  {
    id: "KB-007",
    categoryId: "ambiental",
    title: "Roteiro de defesa administrativa ambiental",
    summary:
      "Passo a passo para manifestação em auto de infração e condicionantes.",
    tags: ["defesa administrativa", "ambiental"],
    updatedAt: "2026-06-03",
    type: "guia",
    status: "publicado",
  },
  {
    id: "KB-008",
    categoryId: "ambiental",
    title: "Nota técnica — licenciamento de silos e armazenagem",
    summary:
      "Requisitos usuais de licenciamento operacional para unidades de armazenagem.",
    tags: ["licenciamento", "compliance"],
    updatedAt: "2026-05-18",
    type: "nota_tecnica",
    status: "publicado",
  },
  {
    id: "KB-009",
    categoryId: "ambiental",
    title: "Checklist de atendimento a condicionantes ambientais",
    summary: "Itens para protocolo de atendimento com ART e relatório técnico.",
    tags: ["condicionante", "checklist"],
    updatedAt: "2026-06-05",
    type: "checklist",
    status: "publicado",
  },
  {
    id: "KB-010",
    categoryId: "sucessao",
    title: "Guia de reunião — sucessão rural e holding familiar",
    summary:
      "Pauta sugerida, documentos preliminares e alinhamento entre gerações.",
    tags: ["sucessão", "holding", "reunião"],
    updatedAt: "2026-05-30",
    type: "guia",
    status: "publicado",
  },
  {
    id: "KB-011",
    categoryId: "sucessao",
    title: "Modelo de acordo de quotistas familiar",
    summary: "Template para governança, tag along e regras de sucessão.",
    tags: ["quotistas", "modelo"],
    updatedAt: "2026-04-08",
    type: "modelo",
    status: "em_revisao",
  },
  {
    id: "KB-012",
    categoryId: "tributario",
    title: "Nota técnica — incentivos fiscais na exportação agro",
    summary: "Análise preliminar de benefícios e documentação de suporte.",
    tags: ["tributário", "exportação"],
    updatedAt: "2026-05-12",
    type: "nota_tecnica",
    status: "publicado",
  },
  {
    id: "KB-013",
    categoryId: "contencioso",
    title: "Estratégia em disputas de posse e limites rurais",
    summary: "Provas, audiência de conciliação e avaliação de risco processual.",
    tags: ["posse", "contencioso"],
    updatedAt: "2026-05-25",
    type: "guia",
    status: "publicado",
  },
  {
    id: "KB-014",
    categoryId: "societario",
    title: "Due diligence em aquisição de área rural",
    summary: "Checklist jurídico para operações societárias com ativos rurais.",
    tags: ["due diligence", "M&A"],
    updatedAt: "2026-06-02",
    type: "checklist",
    status: "publicado",
  },
  {
    id: "KB-015",
    categoryId: "societario",
    title: "FAQ — incorporação de SPEs rurais",
    summary: "Perguntas sobre consolidação de ativos e acordos de quotistas.",
    tags: ["incorporação", "SPE"],
    updatedAt: "2026-04-30",
    type: "faq",
    status: "publicado",
  },
  {
    id: "KB-016",
    categoryId: "modelos",
    title: "Roteiro de reunião comercial — diagnóstico Agro",
    summary: "Pauta para primeira reunião com produtor ou cooperativa.",
    tags: ["comercial", "reunião"],
    updatedAt: "2026-05-08",
    type: "modelo",
    status: "publicado",
  },
  {
    id: "KB-017",
    categoryId: "modelos",
    title: "Checklist de onboarding de nova conta Agro",
    summary: "Passos internos para abertura de relacionamento e mapeamento de riscos.",
    tags: ["onboarding", "CRM"],
    updatedAt: "2026-03-22",
    type: "checklist",
    status: "publicado",
  },
  {
    id: "KB-018",
    categoryId: "regularizacao",
    title: "Nota técnica — retificação de área e risco registral",
    summary: "Impactos de divergência entre área declarada e matrícula.",
    tags: ["retificação", "risco"],
    updatedAt: "2026-02-14",
    type: "nota_tecnica",
    status: "rascunho",
  },
  {
    id: "KB-019",
    categoryId: "contencioso-bancario-rural",
    title: "Checklist de defesa em execução de CCB com alienação fiduciária",
    summary:
      "Roteiro de análise de coisa julgada, liquidez, garantia, citação e impugnações em execução de Cédula de Crédito Bancário com alienação fiduciária.",
    tags: ["CCB", "alienação fiduciária", "execução"],
    updatedAt: "2026-06-15",
    type: "checklist",
    status: "publicado",
  },
  {
    id: "KB-020",
    categoryId: "contencioso-bancario-rural",
    title: "Embargos à execução de CPR: prazos, competência e argumentos essenciais",
    summary:
      "Guia para levantamento de nulidades, excesso de execução, duplicidade e defesa em execução de CPR.",
    tags: ["CPR", "embargos", "execução"],
    updatedAt: "2026-06-12",
    type: "guia",
    status: "publicado",
  },
  {
    id: "KB-021",
    categoryId: "contencioso-bancario-rural",
    title: "Impenhorabilidade da pequena propriedade rural pós-REsp 2.233.886",
    summary:
      "Análise dos requisitos de pequena propriedade, renda familiar predominante e limites de impenhorabilidade após entendimento do STJ.",
    tags: ["impenhorabilidade", "pequena propriedade", "REsp 2.233.886"],
    updatedAt: "2026-06-10",
    type: "nota_tecnica",
    status: "publicado",
  },
  {
    id: "KB-022",
    categoryId: "contencioso-bancario-rural",
    title: "Recuperação judicial do produtor rural: elegibilidade, plano e viabilidade",
    summary:
      "Critérios de elegibilidade, estruturação de plano e cautelas para produtor rural em recuperação judicial.",
    tags: ["recuperação judicial", "produtor rural", "reestruturação"],
    updatedAt: "2026-06-08",
    type: "guia",
    status: "publicado",
  },
  {
    id: "KB-023",
    categoryId: "contencioso-bancario-rural",
    title: "Revisional de contrato de crédito rural: cláusulas abusivas e correção monetária",
    summary:
      "Mapeamento de cláusulas abusivas, juros, indexadores e correção monetária em contratos de crédito rural.",
    tags: ["revisional", "crédito rural", "correção monetária"],
    updatedAt: "2026-06-05",
    type: "guia",
    status: "publicado",
  },
];

export function getKnowledgeCategory(id: string) {
  return KNOWLEDGE_CATEGORIES.find((c) => c.id === id);
}

export function getKnowledgeDocument(id: string) {
  return KNOWLEDGE_DOCUMENTS.find((d) => d.id === id);
}

export function listKnowledgeDocuments(categoryId?: string) {
  const docs = KNOWLEDGE_DOCUMENTS.filter((d) =>
    categoryId ? d.categoryId === categoryId : true,
  );
  return docs.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getKnowledgePayload(categoryId?: string): KnowledgeListResponse {
  return {
    categories: KNOWLEDGE_CATEGORIES,
    documents: listKnowledgeDocuments(categoryId),
  };
}