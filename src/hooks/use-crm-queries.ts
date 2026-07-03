/**
 * Barrel: mantém `@/hooks/use-crm-queries` como ponto de import único
 * enquanto os hooks reais moram em `./queries/*` (split por domínio).
 */
export * from "./queries/query-keys";
export * from "./queries/use-leads";
export * from "./queries/use-accounts";
export * from "./queries/use-opportunities";
export * from "./queries/use-matters";
export * from "./queries/use-tasks";
export * from "./queries/use-deadlines";
export * from "./queries/use-activities";
export * from "./queries/use-audit";
export * from "./queries/use-lookup";
export * from "./queries/use-dashboard";
export * from "./queries/use-misc-lists";
export * from "./queries/use-users";
export * from "./queries/use-meetings";
