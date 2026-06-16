/**
 * Zod schema for CopilotResponse — used with AI SDK's generateObject()
 * to enforce structured output from the LLM.
 */

import { z } from "zod";

export const CopilotResponseSchema = z.object({
  synthesis: z
    .string()
    .describe(
      "Resposta principal em português brasileiro. Use linguagem técnica jurídica acessível. Máximo 3 parágrafos.",
    ),
  risks: z
    .array(z.string())
    .max(5)
    .describe("Lista de riscos identificados (máximo 5 itens)"),
  nextSteps: z
    .array(z.string())
    .max(5)
    .describe("Próximos passos recomendados em ordem de prioridade (máximo 5)"),
  sourceIds: z
    .array(z.string())
    .max(5)
    .describe(
      "IDs dos documentos da Base de Conhecimento relevantes (formato KB-XXX). Use apenas IDs que existam no contexto fornecido.",
    ),
  relatedEntityTypes: z
    .array(z.enum(["conta", "oportunidade", "demanda", "lead"]))
    .describe("Tipos de entidades CRM mencionadas na resposta"),
});

export type CopilotLlmOutput = z.infer<typeof CopilotResponseSchema>;
