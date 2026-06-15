/** Áreas de atuação jurídica do Hub Agro — domínio exclusivo JGG Agro */

export const AGRO_PRACTICE_AREAS = [
  {
    id: "contratos",
    label: "Contratos agrários e comerciais",
    short: "Contratos agrários",
  },
  {
    id: "regularizacao",
    label: "Regularização de imóveis rurais",
    short: "Regularização rural",
  },
  {
    id: "sucessao",
    label: "Planejamento patrimonial e sucessório",
    short: "Sucessório",
  },
  {
    id: "credito",
    label: "Crédito rural, garantias e renegociação",
    short: "Crédito rural",
  },
  {
    id: "ambiental",
    label: "Ambiental, licenciamento e compliance rural",
    short: "Ambiental",
  },
  {
    id: "tributario",
    label: "Tributário aplicado ao agro",
    short: "Tributário agro",
  },
  {
    id: "contencioso",
    label: "Contencioso estratégico e disputas rurais",
    short: "Contencioso rural",
  },
  {
    id: "contencioso-bancario-rural",
    label: "Contencioso bancário-rural e reestruturação de dívidas",
    short: "Contencioso bancário-rural",
  },
  {
    id: "societario",
    label: "Operações societárias e reorganizações",
    short: "Societário",
  },
] as const;

export type AgroPracticeId = (typeof AGRO_PRACTICE_AREAS)[number]["id"];