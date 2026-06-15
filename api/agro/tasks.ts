import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getRelatedTasks,
  getTask,
  listTasks,
  updateTaskStatus,
} from "../_lib/data-service.js";
import { parseTaskListQuery } from "../_lib/list-query.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";
import { getBody, parseTaskStatusPatch } from "../_lib/validation.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
