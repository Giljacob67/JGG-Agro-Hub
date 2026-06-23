/**
 * Migra e popula o PostgreSQL com dados fictícios Agro.
 * Uso:
 *   DATABASE_URL=postgres://... npm run db:setup
 *   DATABASE_URL=postgres://... npm run db:reseed
 */
import { neon } from "@neondatabase/serverless";
import { runMigrations } from "../api/_lib/db/migrate";
import { dbUpsertSeed, dbUpsertUsers } from "../api/_lib/db/repository";
import { getSeedUsers } from "../api/_lib/auth-server";
import { ensureKbEmbeddingsSeeded } from "../api/_lib/llm/rag";
import { hasEmbeddingProvider } from "../api/_lib/llm/embeddings";
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

  const force = process.argv.includes("--force");

  process.env.DATABASE_URL = url;
  const sql = neon(url);

  console.log("Aplicando migração…");
  await runMigrations(sql);

  // Identidade dos usuários (id/email/name/role) — senha continua env-driven.
  console.log("Semeando usuários (identidade)…");
  await dbUpsertUsers(getSeedUsers());

  // E-6: embeddings da base de conhecimento (pgvector). Requer provider.
  if (hasEmbeddingProvider()) {
    console.log("Sincronizando embeddings KB (pgvector)…");
    try {
      await ensureKbEmbeddingsSeeded();
    } catch (err) {
      console.warn("[db:setup] seed de embeddings KB falhou (pode ser preguiçoso no primeiro uso do Copilot):", err);
    }
  } else {
    console.warn("[db:setup] sem COPILOT_EMBEDDINGS_PROVIDER — embeddings KB serão gerados no primeiro uso do Copilot.");
  }

  if (!force) {
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM agro.accounts`;
    if (Number(count) > 0) {
      console.log(
        `Banco já populado (${count} contas). Use --force para re-seed completo.`,
      );
      process.exit(0);
    }
  }

  console.log(force ? "Re-populando seed Agro (force)…" : "Populando seed Agro…");
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