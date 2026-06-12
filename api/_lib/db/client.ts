import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Tipo explícito (arrayMode=false, fullResults=false): cada query retorna
 * Record<string, any>[]. Sem isso, ReturnType<typeof neon> resolve os
 * genéricos para `boolean` e o tipo de retorno vira uma união inutilizável
 * — o build das functions na Vercel falha mesmo com o typecheck local verde.
 */
type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null = null;

export function isDbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql(): Sql {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada");
  }
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}
