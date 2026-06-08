import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;

export function isDbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada");
  }
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}