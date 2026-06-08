/**
 * Migra e popula o PostgreSQL com dados fictícios Agro.
 * Uso: DATABASE_URL=postgres://... npm run db:setup
 */
import { neon } from "@neondatabase/serverless";
import { runMigrations } from "../api/_lib/db/migrate";
import { dbUpsertSeed } from "../api/_lib/db/repository";
import {
  SEED_ACCOUNTS,
  SEED_LEADS,
  SEED_MATTERS,
  SEED_OPPORTUNITIES,
  SEED_TASKS,
} from "../shared/agro/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida.");
    process.exit(1);
  }

  process.env.DATABASE_URL = url;
  const sql = neon(url);

  console.log("Aplicando migração…");
  await runMigrations(sql);

  console.log("Populando seed Agro…");
  await dbUpsertSeed({
    accounts: SEED_ACCOUNTS,
    leads: SEED_LEADS,
    opportunities: SEED_OPPORTUNITIES,
    matters: SEED_MATTERS,
    tasks: SEED_TASKS,
  });

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM agro.leads`;
  console.log(`Concluído. ${count} leads no banco.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});