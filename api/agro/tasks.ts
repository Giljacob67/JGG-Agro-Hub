import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRelatedTasks, getTask, listTasks } from "../../shared/agro/store";
import { json, methodNotAllowed, requireAuth } from "../_lib/http";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "tasks")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    const relatedTo = req.query.relatedTo as string | undefined;

    if (relatedTo) return json(res, getRelatedTasks(relatedTo));

    if (id) {
      const task = getTask(id);
      if (!task) return json(res, { error: "Tarefa não encontrada" }, 404);
      return json(res, task);
    }
    return json(res, listTasks());
  }

  return methodNotAllowed(res);
}