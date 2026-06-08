import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { TaskStatus } from "../../shared/agro/types";
import {
  getRelatedTasks,
  getTask,
  listTasks,
  updateTaskStatus,
} from "../_lib/data-service";
import { json, methodNotAllowed, requireAuth } from "../_lib/http";

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
    return json(res, await listTasks());
  }

  if (req.method === "PATCH") {
    const id = req.query.id as string | undefined;
    const { status } = req.body ?? {};
    if (!id || !status) {
      return json(res, { error: "id e status são obrigatórios" }, 400);
    }
    const task = await updateTaskStatus(id, status as TaskStatus);
    if (!task) return json(res, { error: "Tarefa não encontrada" }, 404);
    return json(res, task);
  }

  return methodNotAllowed(res);
}