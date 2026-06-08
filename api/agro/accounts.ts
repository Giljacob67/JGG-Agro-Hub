import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getAccount,
  getAccountTimeline,
  listAccounts,
} from "../_lib/data-service";
import { json, methodNotAllowed, requireAuth } from "../_lib/http";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    return json(res, await listAccounts());
  }

  return methodNotAllowed(res);
}