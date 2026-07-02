/**
 * Backfill de julgados KB importados sem body/ementa/metadados estruturados.
 *
 * Contexto: um script externo (fora deste repo) importou 2351 julgados do
 * DRJuris para `agro.kb_documents`, mas só preencheu title/summary/tags/
 * category_id — nunca body/ementa/tribunal/relator/numero_processo/
 * data_julgamento. O tribunal/relator/data ficaram plantados no `title`
 * (formato "[TRIB] tópico (Relator, YYYY-MM-DD)") e o `summary` é um resumo
 * truncado a ~2000 chars — o texto integral da ementa está só no export
 * original (zip com JSON/CSV/SQLite da base DRJuris).
 *
 * Este script casa cada `kb_documents` (pelo título parseado: tribunal +
 * relator + data_julgamento + tópico) com o registro correspondente no JSON
 * de origem, e faz UPDATE de body/ementa/tribunal/relator/data_julgamento/
 * numero_processo — só em linhas ainda vazias (idempotente, não sobrescreve
 * conteúdo já preenchido por outra via).
 *
 * Uso:
 *   DATABASE_URL=postgres://... npx tsx scripts/backfill-kb-julgados.ts <path-para-json-do-zip>
 *
 * O JSON esperado é um array de objetos com os campos do DRJuris:
 *   { id, tribunal, tribunal_nome, relator, data_julgamento, ementa, resumo,
 *     tema, subtema, topico, status, radar_edicao, created_at, published_at }
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "node:fs";

interface DrJurisRecord {
  id: string;
  tribunal: string;
  tribunal_nome: string;
  relator: string | null;
  data_julgamento: string | null;
  ementa: string;
  resumo: string;
  tema: string;
  subtema: string;
  topico: string;
}

interface KbDocRow {
  id: string;
  title: string;
}

/** Extrai tribunal/tópico/relator/data do título "[TRIB] tópico (Relator, YYYY-MM-DD)". */
function parseTitle(
  title: string,
): { tribunal: string; topico: string; relator: string; data: string } | null {
  const m = title.match(/^\[([^\]]+)\]\s+(.*)\s\(([^,()]+),\s*(\d{4}-\d{2}-\d{2})\)$/);
  if (!m) return null;
  return { tribunal: m[1], topico: m[2].trim(), relator: m[3].trim(), data: m[4] };
}

/** Melhor esforço: número CNJ (NNNNNNN-NN.NNNN.N.NN.NNNN) dentro da ementa. */
function extractNumeroProcesso(ementa: string): string | null {
  const m = ementa.match(/\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/);
  return m ? m[1] : null;
}

function matchKey(tribunal: string, relator: string, data: string, topico: string): string {
  return `${tribunal}||${relator}||${data}||${topico}`;
}

/** minúsculas + sem acento — pra comparar nomes truncados/acentuação divergente. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida.");
    process.exit(1);
  }
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Uso: DATABASE_URL=... npx tsx scripts/backfill-kb-julgados.ts <path-para-json>");
    process.exit(1);
  }

  const records: DrJurisRecord[] = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`Carregados ${records.length} registros do DRJuris.`);

  // Camada 1: chave exata tribunal+relator+data+tópico.
  const byExactKey = new Map<string, DrJurisRecord[]>();
  // Camada 2 (fallback): tribunal+data+tópico, sem relator — usada quando o
  // título no banco teve o nome do relator truncado pelo import externo
  // (ex.: "Teixeir" em vez de "Teixeira") ou relator nulo virou "N/A" no título.
  const byTribDataTopico = new Map<string, DrJurisRecord[]>();
  for (const rec of records) {
    if (!rec.tribunal || !rec.data_julgamento) continue;
    if (rec.relator) {
      const exactKey = matchKey(rec.tribunal, rec.relator, rec.data_julgamento, rec.topico ?? "");
      const exactGroup = byExactKey.get(exactKey);
      if (exactGroup) exactGroup.push(rec);
      else byExactKey.set(exactKey, [rec]);
    }
    const fbKey = `${rec.tribunal}||${rec.data_julgamento}||${rec.topico ?? ""}`;
    const fbGroup = byTribDataTopico.get(fbKey);
    if (fbGroup) fbGroup.push(rec);
    else byTribDataTopico.set(fbKey, [rec]);
  }

  /** Resolve um título parseado pro registro DRJuris correspondente (ou null/ambíguo). */
  function findCandidate(
    parsed: { tribunal: string; topico: string; relator: string; data: string },
  ): { rec: DrJurisRecord | null; ambiguous: boolean } {
    const exactKey = matchKey(parsed.tribunal, parsed.relator, parsed.data, parsed.topico);
    const exactGroup = byExactKey.get(exactKey);
    if (exactGroup) {
      if (exactGroup.length === 1) return { rec: exactGroup[0], ambiguous: false };
      return { rec: null, ambiguous: true };
    }

    const fbGroup = byTribDataTopico.get(`${parsed.tribunal}||${parsed.data}||${parsed.topico}`) ?? [];
    const parsedRelatorNorm = normalize(parsed.relator);
    const isNA = parsedRelatorNorm === "n/a" || parsedRelatorNorm === "";
    const filtered = fbGroup.filter((rec) => {
      if (isNA) return !rec.relator;
      if (!rec.relator) return false;
      const recRelatorNorm = normalize(rec.relator);
      // Prefixo em qualquer direção: cobre truncamento do título no banco
      // (mais comum) e eventuais truncamentos no lado do JSON de origem.
      return recRelatorNorm.startsWith(parsedRelatorNorm) || parsedRelatorNorm.startsWith(recRelatorNorm);
    });
    if (filtered.length === 1) return { rec: filtered[0], ambiguous: false };
    if (filtered.length > 1) return { rec: null, ambiguous: true };
    return { rec: null, ambiguous: false };
  }

  const sql = neon(url);
  const rows = (await sql`
    SELECT id, title FROM agro.kb_documents
    WHERE body IS NULL AND ementa IS NULL
  `) as unknown as KbDocRow[];
  console.log(`${rows.length} docs no banco ainda sem body/ementa (candidatos a backfill).`);

  let matched = 0;
  let ambiguous = 0;
  let unparsed = 0;
  let notFound = 0;
  let failed = 0;
  const unresolved: Array<{ id: string; title: string; reason: string }> = [];

  const CONCURRENCY = 10;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (row) => {
        const parsed = parseTitle(row.title);
        if (!parsed) {
          unparsed++;
          unresolved.push({ id: row.id, title: row.title, reason: "title não bate no padrão [TRIB] tópico (Relator, data)" });
          return;
        }
        const { rec, ambiguous: isAmbiguous } = findCandidate(parsed);
        if (isAmbiguous) {
          ambiguous++;
          unresolved.push({ id: row.id, title: row.title, reason: "múltiplos candidatos ambíguos no JSON (mesmo tribunal/relator/data/tópico)" });
          return;
        }
        if (!rec) {
          notFound++;
          unresolved.push({ id: row.id, title: row.title, reason: "sem correspondência no JSON de origem" });
          return;
        }
        const numeroProcesso = extractNumeroProcesso(rec.ementa);
        // Blindado contra soluços de rede pontuais (fetch failed/ECONNRESET):
        // até 3 tentativas com backoff antes de desistir dessa linha — sem
        // derrubar o Promise.all inteiro (as demais linhas do batch seguem).
        let lastErr: unknown;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await sql`
              UPDATE agro.kb_documents
              SET body = ${rec.ementa},
                  ementa = ${rec.ementa},
                  tribunal = ${rec.tribunal},
                  relator = ${rec.relator},
                  data_julgamento = ${rec.data_julgamento},
                  numero_processo = ${numeroProcesso},
                  updated_at = now()
              WHERE id = ${row.id} AND body IS NULL AND ementa IS NULL
            `;
            matched++;
            return;
          } catch (err) {
            lastErr = err;
            await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          }
        }
        failed++;
        unresolved.push({
          id: row.id,
          title: row.title,
          reason: `falha de rede após 3 tentativas: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
        });
      }),
    );
    if ((i / CONCURRENCY) % 20 === 0) {
      console.log(`  …processados ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length}`);
    }
  }

  console.log(`\nConcluído.`);
  console.log(`  Atualizados:        ${matched}`);
  console.log(`  Título não parseou: ${unparsed}`);
  console.log(`  Sem match no JSON:  ${notFound}`);
  console.log(`  Ambíguos (>1):      ${ambiguous}`);
  console.log(`  Falha de rede:      ${failed} (rerode o script, é idempotente)`);

  if (unresolved.length > 0) {
    const outPath = "kb-backfill-unresolved.json";
    writeFileSync(outPath, JSON.stringify(unresolved, null, 2), "utf-8");
    console.log(`  Detalhes dos não resolvidos (${unresolved.length}) em: ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
