import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  convertLead,
  createLead,
  getLead,
  listLeads,
  updateLead,
  getAccount,
  getAccountTimeline,
  listAccounts,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
  getMatter,
  getMattersByOpportunity,
  listMatters,
  updateMatter,
  getRelatedTasks,
  getTask,
  listTasks,
  updateTaskStatus,
  listDeadlines,
  createDeadline,
  updateDeadline,
  listActivities,
  createActivity,
  loadCrmDataset,
} from "../_lib/data-service.js";
import { computeCrmStats } from "../../shared/agro/stats.js";
import { resolveCopilotQuery } from "../../shared/agro/copilot.js";
import { getKnowledgePayload } from "../../shared/agro/knowledge.js";
import {
  parseLeadListQuery,
  parseAccountListQuery,
  parseOpportunityListQuery,
  parseMatterListQuery,
  parseTaskListQuery,
} from "../_lib/list-query.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";
import {
  getBody,
  parseLeadConversion,
  parseLeadCreate,
  parseLeadPatch,
  parseOpportunityPatch,
  parseMatterPatch,
  parseTaskStatusPatch,
  parseDeadlineCreate,
  parseDeadlinePatch,
  parseActivityCreate,
  isActivityEntityType,
} from "../_lib/validation.js";

/**
 * API consolidada — todas as rotas /api/agro/* em uma só Serverless Function
 * para respeitar o limite de 12 functions do plano Hobby da Vercel.
 *
 * Rotas:
 * /api/agro/leads?...         (leads, lead by id, convert lead)
 * /api/agro/accounts?...      (accounts, account by id, timeline)
 * /api/agro/opportunities?... (opportunities, opportunity by id)
 * /api/agro/matters?...       (matters, matter by id, by opportunity)
 * /api/agro/tasks?...         (tasks, task by id, related tasks)
 * /api/agro/deadlines?...     (deadlines)
 * /api/agro/activities?...    (activities)
 * /api/agro/stats             (CRM stats)
 * /api/agro/copilot           (copilot query)
 * /api/agro/knowledge         (knowledge base)
 */

function getResource(req: VercelRequest): string | undefined {
  // Vercel captura o path param "resource" da rota /api/agro/[resource].ts
  const raw = req.query.resource as string | undefined;
  if (!raw) return undefined;
  // Remove query string se houver
  const clean = raw.split("?")[0].toLowerCase();
  return clean || undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = getResource(req);

  if (!resource) {
    return json(res, { error: "Recurso não especificado" }, 400);
  }

  // ── Leads ──────────────────────────────────────────────────────────
  if (resource === "leads") {
    if (!requireAuth(req, res, "leads")) return;

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      if (id) {
        const lead = await getLead(id);
        if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
        return json(res, lead);
      }
      return json(res, await listLeads(parseLeadListQuery(req)));
    }

    if (req.method === "POST") {
      const body = getBody(req.body);

      if (req.query.action === "convert" || body.action === "convert") {
        const id = (req.query.id as string | undefined) ?? body.id;
        if (!id) return json(res, { error: "id é obrigatório" }, 400);
        const input = parseLeadConversion(body);
        if (!input.ok) return json(res, { error: input.error }, 400);
        const result = await convertLead(String(id), input.data);
        if (!result.ok) {
          const status = result.reason === "not_found" ? 404 : 409;
          const message =
            result.reason === "not_found"
              ? "Lead não encontrado"
              : result.reason === "already_converted"
                ? "Lead já convertido em oportunidade"
                : "Lead descartado não pode ser convertido";
          return json(res, { error: message, reason: result.reason }, status);
        }
        return json(res, result, 201);
      }

      const input = parseLeadCreate(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const lead = await createLead(input.data);
      return json(res, lead, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const patch = parseLeadPatch(getBody(req.body));
      if (!patch.ok) return json(res, { error: patch.error }, 400);
      const lead = await updateLead(id, patch.data);
      if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
      return json(res, lead);
    }

    return methodNotAllowed(res);
  }

  // ── Accounts ───────────────────────────────────────────────────────
  if (resource === "accounts") {
    if (!requireAuth(req, res, "accounts")) return;

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      if (id) {
        const account = await getAccount(id);
        if (!account) return json(res, { error: "Conta não encontrada" }, 404);
        if (req.query.timeline === "1") {
          return json(res, {
            account,
            timeline: await getAccountTimeline(id),
          });
        }
        return json(res, account);
      }
      return json(res, await listAccounts(parseAccountListQuery(req)));
    }

    return methodNotAllowed(res);
  }

  // ── Opportunities ──────────────────────────────────────────────────
  if (resource === "opportunities") {
    if (!requireAuth(req, res, "opportunities")) return;

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      if (id) {
        const opp = await getOpportunity(id);
        if (!opp) return json(res, { error: "Oportunidade não encontrada" }, 404);
        return json(res, opp);
      }
      return json(res, await listOpportunities(parseOpportunityListQuery(req)));
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const patch = parseOpportunityPatch(getBody(req.body));
      if (!patch.ok) return json(res, { error: patch.error }, 400);
      const opp = await updateOpportunity(id, patch.data);
      if (!opp) return json(res, { error: "Oportunidade não encontrada" }, 404);
      return json(res, opp);
    }

    return methodNotAllowed(res);
  }

  // ── Matters ────────────────────────────────────────────────────────
  if (resource === "matters") {
    if (!requireAuth(req, res, "matters")) return;

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      if (id) {
        const matter = await getMatter(id);
        if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
        return json(res, matter);
      }
      const opportunityId = req.query.opportunityId as string | undefined;
      if (opportunityId) {
        return json(res, await getMattersByOpportunity(opportunityId));
      }
      return json(res, await listMatters(parseMatterListQuery(req)));
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const patch = parseMatterPatch(getBody(req.body));
      if (!patch.ok) return json(res, { error: patch.error }, 400);
      const matter = await updateMatter(id, patch.data);
      if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
      return json(res, matter);
    }

    return methodNotAllowed(res);
  }

  // ── Tasks ──────────────────────────────────────────────────────────
  if (resource === "tasks") {
    if (!requireAuth(req, res, "tasks")) return;

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      const relatedTo = req.query.relatedTo as string | undefined;

      if (relatedTo) return json(res, await getRelatedTasks(relatedTo));

      if (id) {
        const task = await getTask(id);
        if (!task) return json(res, { error: "Tarefa não encontrada" }, 404);
        return json(res, task);
      }
      return json(res, await listTasks(parseTaskListQuery(req)));
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const status = parseTaskStatusPatch(getBody(req.body));
      if (!status.ok) return json(res, { error: status.error }, 400);
      const task = await updateTaskStatus(id, status.data);
      if (!task) return json(res, { error: "Tarefa não encontrada" }, 404);
      return json(res, task);
    }

    return methodNotAllowed(res);
  }

  // ── Deadlines ──────────────────────────────────────────────────────
  if (resource === "deadlines") {
    if (!requireAuth(req, res, "deadlines")) return;

    if (req.method === "GET") {
      const matterId = req.query.matterId as string | undefined;
      return json(res, await listDeadlines(matterId));
    }

    if (req.method === "POST") {
      const input = parseDeadlineCreate(getBody(req.body));
      if (!input.ok) return json(res, { error: input.error }, 400);
      const matter = await getMatter(input.data.matterId);
      if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
      const deadline = await createDeadline(input.data);
      return json(res, deadline, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const patch = parseDeadlinePatch(getBody(req.body));
      if (!patch.ok) return json(res, { error: patch.error }, 400);
      const deadline = await updateDeadline(id, patch.data);
      if (!deadline) return json(res, { error: "Prazo não encontrado" }, 404);
      return json(res, deadline);
    }

    return methodNotAllowed(res);
  }

  // ── Activities ─────────────────────────────────────────────────────
  if (resource === "activities") {
    if (!requireAuth(req, res, "activities")) return;

    if (req.method === "GET") {
      const entityId = req.query.entityId as string | undefined;
      const rawEntityType = req.query.entityType;
      const entityType =
        typeof rawEntityType === "string" && isActivityEntityType(rawEntityType)
          ? rawEntityType
          : undefined;
      if (rawEntityType && !entityType) {
        return json(res, { error: "entityType inválido" }, 400);
      }
      return json(res, await listActivities(entityId, entityType));
    }

    if (req.method === "POST") {
      const input = parseActivityCreate(getBody(req.body));
      if (!input.ok) return json(res, { error: input.error }, 400);
      const activity = await createActivity(input.data);
      return json(res, activity, 201);
    }

    return methodNotAllowed(res);
  }

  // ── Stats ──────────────────────────────────────────────────────────
  if (resource === "stats") {
    if (!requireAuth(req, res, "stats")) return;

    if (req.method === "GET") {
      const dataset = await loadCrmDataset();
      return json(
        res,
        computeCrmStats({
          leads: dataset.leads,
          accounts: dataset.accounts,
          opportunities: dataset.opportunities,
          matters: dataset.matters,
          tasks: dataset.tasks,
        }),
      );
    }

    return methodNotAllowed(res);
  }

  // ── Copilot ────────────────────────────────────────────────────────
  if (resource === "copilot") {
    if (!requireAuth(req, res, "copilot")) return;

    if (req.method === "POST") {
      const body = (req.body ?? {}) as {
        query?: string;
        contextEntity?: import("../../shared/agro/types.js").CopilotContextEntity | null;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
      };
      if (!body.query?.trim()) {
        return json(res, { error: "query é obrigatório" }, 400);
      }

      const dataset = await loadCrmDataset();
      const stats = computeCrmStats({
        leads: dataset.leads,
        accounts: dataset.accounts,
        opportunities: dataset.opportunities,
        matters: dataset.matters,
        tasks: dataset.tasks,
      });

      const query = body.query.trim();
      const contextEntity = body.contextEntity ?? null;

      // Try LLM pipeline first; fall back to keyword engine
      try {
        const { getDefaultConfig, createProvider } = await import("../_lib/llm/providers.js");
        const llmConfig = getDefaultConfig();

        if (llmConfig) {
          // RAG: semantic search on KB
          const { searchKnowledge } = await import("../_lib/llm/rag.js");
          const ragResults = await searchKnowledge(query, 5);

          // Build prompt
          const { buildSystemPrompt, buildUserMessage } = await import("../_lib/llm/prompt.js");
          const systemPrompt = buildSystemPrompt({
            query,
            contextEntity,
            stats,
            ragResults,
            history: body.history,
          });
          const userMessage = buildUserMessage(query, body.history);

          // Generate structured output with AI SDK v6
          const { generateText, Output } = await import("ai");
          const { CopilotResponseSchema } = await import("../_lib/llm/schema.js");

          const modelFactory = createProvider(llmConfig.provider);

          const { output: llmOutput } = await generateText({
            model: modelFactory(llmConfig.model),
            system: systemPrompt,
            prompt: userMessage,
            output: Output.object({ schema: CopilotResponseSchema }),
            temperature: llmConfig.temperature ?? 0.3,
          });

          if (!llmOutput) {
            throw new Error("LLM returned no output");
          }

          // Resolve KB sources from sourceIds
          const { getKnowledgeDocument, getKnowledgeCategory } = await import("../../shared/agro/knowledge.js");
          const sources = llmOutput.sourceIds
            .map((id: string) => {
              const doc = getKnowledgeDocument(id);
              if (!doc) return null;
              const cat = getKnowledgeCategory(doc.categoryId);
              return {
                id: `src-${id}`,
                documentId: id,
                title: doc.title,
                excerpt: doc.summary,
                categoryLabel: cat?.label ?? "",
              };
            })
            .filter(Boolean) as Array<{
            id: string;
            documentId: string;
            title: string;
            excerpt: string;
            categoryLabel: string;
          }>;

          // Resolve related CRM entities
          const relatedEntities: Array<{
            id: string;
            type: "conta" | "oportunidade" | "demanda" | "lead";
            name: string;
          }> = [];
          if (contextEntity) {
            relatedEntities.push({
              id: contextEntity.id,
              type: contextEntity.type,
              name: contextEntity.name,
            });
          }

          const response: import("../../shared/agro/types.js").CopilotResponse = {
            id: `cop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            promptId: null,
            query,
            synthesis: llmOutput.synthesis,
            risks: llmOutput.risks,
            nextSteps: llmOutput.nextSteps,
            sources,
            relatedEntities,
            simulated: false,
            disclaimer:
              "Esta análise é gerada por IA e tem caráter informativo. Não substitui consulta a um advogado especializado.",
            generatedAt: new Date().toISOString(),
          };

          return json(res, response);
        }
      } catch (err) {
        console.error("[Copilot] LLM pipeline failed, falling back to keywords:", err);
      }

      // Fallback: keyword engine
      const response = resolveCopilotQuery(
        { query, contextEntity },
        stats,
      );

      return json(res, response);
    }

    return methodNotAllowed(res);
  }

  // ── Knowledge ──────────────────────────────────────────────────────
  if (resource === "knowledge") {
    if (!requireAuth(req, res, "knowledge")) return;

    if (req.method === "GET") {
      const categoryId =
        typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
      return json(res, getKnowledgePayload(categoryId));
    }

    return methodNotAllowed(res);
  }

  return json(res, { error: "Recurso não encontrado" }, 404);
}
