# RELATÓRIO DE AUDITORIA — JGG Agro Hub

**Data:** 22/06/2026 · **Base:** `/home/gilberto-jacob/Documentos/JGG-Agro-Hub` · **Escopo:** `api/`, `src/`, `shared/`, `db/`, `scripts/`, `e2e/`, configs · **Tipo:** read-only (nenhuma alteração ao código)

---

## Sumário executivo

CRM jurídico agrícola verticalizado (React 19 + Vite 8 + Tailwind 4 + TanStack Query · Vercel Serverless · Neon Postgres · AI SDK v6 · R2 · Resend · scrypt+HMAC). Evoluiu muito desde a auditoria de 12/06: **9 de 12 itens corrigidos** (auth bypass, senhas individuais, SSO open-redirect, token em cookie HttpOnly, CSRF, enum validation, rate limit, headers CSP, pageSize cap, CI, conteúdo de contencioso bancário-rural). Restam **3 itens da auditoria anterior** + **novos achados**.

| Frente | Crítica | Alta | Média | Baixa |
|---|---|---|---|---|
| Segurança | 1 | 1 | 4 | 3 |
| Qualidade | 0 | 5 | 10 | 9 |
| Arquitetura | 0 | 3 | 5 | 6 |

**Top 5 a corrigir agora:**
1. **CRÍTICA** — `api/_lib/sso.ts:135-156` id_token JWT sem verificação de assinatura (JWKS) → SSO forjável.
2. **ALTA** — `README.md:9-13` senha `AgroHub2026!` documentada em repo público.
3. **ALTA** — `api/_lib/audit.ts` audit log in-memory nunca persiste em prod (handler chama módulo errado; `recordAudit` do data-service não é invocado).
4. **ALTA** — 12 recursos sem validação de payload (`documents`, `time-entries`, `tax-obligations`, `environmental-licenses`, `credit-instruments`, `crop-seasons`, `contacts`, `properties`, `opposing-parties`, `invoices`, `fee-agreements`, `document-checklist`) — aceitam enums arbitrários.
5. **ALTA** — 12 recursos ainda em memory store em produção (bypassam `data-service` + guard, perdem escrita em serverless).

---

## 1. SEGURANÇA

### 1.1 Status dos itens da auditoria anterior

| # | Item | Estado |
|---|---|---|
| 1 | `resolveSession` aceita dev tokens com AUTH_SECRET set | ✅ CORRIGIDO (`auth-server.ts:184-197`) |
| 2 | Senha compartilhada hardcoded / README público | ⚠️ PARCIAL (código OK; README ainda vaza senha) |
| 3 | SSO open redirect `?from=` | ✅ CORRIGIDO (`sanitizeFrom` `[action].ts:94-99`) |
| 4 | Token em query string | ✅ CORRIGIDO (cookie `__Host-agro_session` HttpOnly+Secure) |
| 5 | SSO sem CSRF/nonce/PKCE/validação id_token | ⚠️ PARCIAL (CSRF/nonce/PKCE OK; assinatura JWT não validada) |
| 6 | PATCH/POST sem validação de enums | ✅ CORRIGIDO para 7 recursos CRM (`validation.ts:72-85`) |
| 7 | `db-setup.ts` não timing-safe | ✅ CORRIGIDO (HMAC + `timingSafeEqual`) |
| 8 | Rate limiting no login | ✅ CORRIGIDO (`rate-limit.ts:42-74`, Upstash + fallback) |
| 9 | Security headers no `vercel.json` | ✅ CORRIGIDO (CSP/HSTS/X-Frame-Options DENY, `vercel.json:38-64`) |
| 10 | pageSize sem cap server-side | ✅ CORRIGIDO (`list-query.ts:15` MAX 200 + repository `Math.min` 100) |
| 11 | CSRF protection | ✅ CORRIGIDO (`csrf.ts` + `http.ts:requireCsrf`) |
| 12 | Token em localStorage | ✅ CORRIGIDO (cookie HttpOnly; `credentials:"include"`; legacy deprecated) |

### 1.2 Achados novos — Segurança

**🔴 CRÍTICA · S-1 · `api/_lib/sso.ts:135-156` — id_token sem verificação de assinatura (JWKS)**

`validateIdToken` extrai `signatureB64` mas nunca valida contra JWKS. `OidcMetadata.jwks_uri` é declarado no tipo (linha 15) mas nunca fetchado/usado. `iss`/`aud` são públicos. Consequência: quem conhece `SSO_ISSUER` + `SSO_CLIENT_ID` (necessários para iniciar o fluxo legítimo) pode forjar um id_token com `email=agro@jgggroup.com.br`, `email_verified=true` e bypassar o SSO inteiro → loga como qualquer usuário mapeado em `findUserByEmail`. O `expectedNonce` não protege (atacante controla o payload inteiro).

**Fix:** usar `jose` (`jwtVerify` + `createRemoteJWKSet(meta.jwks_uri)`); validar `alg`/`kid`/`iss`/`aud`/`exp`/`nonce`. Cache de JWKS. Esforço S.

**🟠 ALTA · S-2 · `README.md:9-13` — senha `AgroHub2026!` em repo público**

O código exige hashes individuais via env (`AUTH_PASSWORD_HASH_GESTAO/COMERCIAL/JURIDICO`) quando `AUTH_SECRET` está setado; sem hashes, login por senha fica desabilitado (resta SSO). Mas o README documenta a senha em texto plano. Se os hashes de produção derivam de `AgroHub2026!`, qualquer um loga como gestão.

**Fix:** remover tabela de senhas do README; girar senhas de produção; confirmar hashes ≠ `AgroHub2026!`. Esforço XS.

**🟡 MÉDIA · S-3 · `auth-server.ts:184-197` — `resolveSession` sem guard de produção**

`authenticate` e `issueSessionForUser` têm guard `isProduction()`, mas `resolveSession` não. Em deployment Vercel `preview` sem `AUTH_SECRET`, atacante forja token com `signToken({role:"gestao"}, "dev-insecure")` (secret público).

**Fix:** `if (isProduction()) return null;` antes do fallback dev. Esforço XS.

**🟡 MÉDIA · S-4 · `api/agro/[resource].ts:115` — CORS `Allow-Origin: *` com `Allow-Credentials: true` quando `APP_URL` ausente**

Combinação inválida per spec CORS. Misconfiguration; quebra requests autenticados se `APP_URL` faltar. Mesmo padrão em `api/upload.ts:5-9`.

**Fix:** nunca fallback `*` com credentials; usar a origin do request se válida, ou 503. Esforço XS.

**🟡 MÉDIA · S-5 · `api/_lib/r2.ts:87-96` — `prefix` do body não sanitizado em `generateFileKey`**

`originalName` é sanitizado, mas `prefix` (vindo do cliente) não. Permite chaves arbitrárias no bucket R2 (`prefix="admin/private"`, `prefix="../../../x"`). R2 é object storage (sem path traversal no FS), mas escreve fora do namespace `docs/` esperado.

**Fix:** sanitizar `prefix` com a mesma regex aplicada a `originalName`; ou whitelist de prefixos. Esforço XS.

**🟡 MÉDIA · S-6 · `api/_lib/audit.ts:43` — audit log in-memory, sem integridade/durabilidade**

`auditLogs[]` module-level, MAX 10000, per-instance. Em serverless, perdido entre invocações. Sem IP, sem chain hash, sem persistência. CRM jurídico exige compliance. O handler chama `auditCreate/Update/Delete` (in-memory) — **nunca** `recordAudit` (`data-service.ts:450`, que chama `db.dbCreateAuditLog`). Em produção com DB, `agro.audit_logs` fica vazio.

**Fix:** rotear audit por `recordAudit`; estender `agro.audit_logs` com `before/after/changes` JSONB + IP + chain hash; migrar `queryAuditLogs`/`getAuditStats` para SQL. Esforço M.

**🟢 BAIXA · S-7 · `sso.ts:187` `authSecretOrDev()` fallback `"dev-insecure"`** — state assinado com chave pública se `AUTH_SECRET` ausente (preview/edge).

**🟢 BAIXA · S-8 · `llm/providers.ts:66` `OLLAMA_BASE_URL` default `https://ollama.com/v1`** — URL incorreta (Ollama Cloud, não API local). Funcional, não segurança.

**🟢 BAIXA · S-9 · `csrf.ts:8` `CSRF_SECRET` fallback `"jgg-csrf-dev-secret"`** — tokens CSRF forjáveis em dev; OK se produção sempre seta `CSRF_SECRET`/`AUTH_SECRET`. Store in-memory por instância → tokens podem falhar entre instâncias serverless; migrar para Upstash.

### 1.3 Pontos verificados — limpos

- **SQL injection:** `repository.ts` usa placeholders `$N` + array `values`; tagged template `sql` parametrizada pelo Neon; LIKE escapado via `sqlLikeTerm` (`repository.ts:43-45`). **Sem injection.**
- **Secrets hardcoded:** apenas refs `process.env`; literais dev-only (`"dev-insecure"`, `"agro-jgg-salt-v1"`, `"jgg-csrf-dev-secret"`). Nenhuma chave real no código.
- **.env committed:** `.gitignore:8` ignora `.vercel/`; `.vercel/.env.development.local` ignorado; só `.env.example` (template) rastreado. **OK.**
- **CI secrets:** `.github/workflows/ci.yml` só typecheck/lint/test/build; sem `secrets.` expostos.
- **LLM prompt injection:** input do usuário entra em `buildUserMessage` sem escaping; mitigado por output estruturado (`Output.object(CopilotResponseSchema)`), disclaimer fixo, resposta não executa ações. API keys server-side only (`providers.ts:44-89`); nenhuma `VITE_` expõe chave.
- **R2 SigV4:** assinatura HMAC encadeada correta (kDate→kRegion→kService→kSigning); `expiresIn` 3600s. **Atenção:** `r2.ts:89` usa `Math.random()` (não crypto-secure) no componente aleatório da chave — usar `crypto.randomBytes`. Se `R2_PUBLIC_URL` configurado público, docs jurídicos ficam acessíveis por URL (chave timestamp+random não criptograficamente unguessable).

### 1.4 Dependências

`ai@^6`, `@ai-sdk/*@3`, `@neondatabase/serverless@^1.1.0`, `@vercel/node@^5.8.17`, `react@^19.1`, `zod@^3.25`, `resend@^6.12` — todos atuais. `overrides`: `undici@^5.28.5` sob `@vercel/node` — **verificar CVE-2025-22150** (proxy-authorization leak); considerar bump 5.29+ se compatível. `esbuild@^0.28.1`, `path-to-regexp@^6.3`, `minimatch@^10.2` — overrides anti-ReDoS/CVE transitivos, OK.

---

## 2. QUALIDADE / CONSISTÊNCIA

### 2.1 Itens da auditoria anterior — status

| Item | Estado |
|---|---|
| `roleCanAccess` duplicado | ✅ CORRIGIDO (import de `@shared/agro/auth`) |
| `dbCreateLead` ID por `COUNT(*)+1` | ✅ CORRIGIDO (`uuidPrefix("LD")` = `crypto.randomUUID()`) |
| Filtros in-memory `SELECT *` | ⚠️ PARCIAL (`dbList*` têm WHERE/LIMIT/OFFSET; mas `facets=true` re-SELECT * + JS) |
| Lint `react-refresh` 3 warnings | ✅ CORRIGIDO (split context/value + `button-variants`) |
| `formatDate`/`isOverdue` hack `T12:00:00` | ⚠️ PARCIAL (`format-utils.ts:18` reescrito; `date-utils.ts:6,12` ainda usa) |

### 2.2 Achados — Qualidade

**Duplicação**

- **ALTA · Q-1 · `api/agro/[resource].ts` (1705 linhas, 26 branches `if(resource==="X")`)** — cada bloco repete `requireAuth`/`requireCsrf`/`guardWrite` + dispatch por método. Impossível de revisar. **Fix:** extrair `api/_lib/resources/<name>.ts` com interface `{list,get,create,update,remove}` + dispatcher table-driven. Esforço M.
- **MÉDIA · Q-2 · 5 `create-*-form.tsx` copy-paste** — mesmo esqueleto `useState`+`handleSubmit`+`toast`. **Fix:** hook `useCreateEntityForm` + `<CreateEntityFormShell>`. Esforço M.
- **MÉDIA · Q-3 · 4 `*-detail.tsx` repetem scaffold** (lead/account/opportunity/matter-detail). **Fix:** `<DetailPageScaffold>`. Esforço M.
- **ALTA · Q-4 · Audit `entityType` errado para 8 recursos** — `[resource].ts:1075,1092,1110,1208,1560,1604,1648,1696` chamam `auditCreate(..., "lead" as AuditEntityType, ...)` para document/time-entry/tax/license/credit/crop. `AuditEntityType` não inclui esses; `as` força cast e o log registra tipo errado. **Fix:** estender union + remover casts. Esforço S.
- **BAIXA · Q-5 · `TOKEN_TTL_MS` duplicado** em `shared/agro/auth.ts:73` e `auth-server.ts:64`. Mover para `shared/agro/auth-config.ts`.

**Dead code**

- **BAIXA · Q-6 · `src/lib/navigation.ts:98` `MAIN_NAV`** — `@deprecated`, sem uso. Remover.
- **BAIXA · Q-7 · `src/lib/api/client.ts:20` `setAuthToken`** — `@deprecated`, sem chamadores. Remover.
- **BAIXA · Q-8 · `src/lib/crm-filter-helpers.ts:3,21` `uniqueSorted`/`matchesValueRange`** — sem uso. Remover.
- **BAIXA · Q-9 · `auth-context-value.ts:8` `acceptToken`** — `@deprecated` (cookie HttpOnly). Remover após confirmar.
- **BAIXA · Q-10 · `llm/providers.ts:141-164` `generateStructured`** — dead; handler usa `generateText + Output.object` direto.

**Tipagem**

- **ALTA · Q-11 · 81 ocorrências `: any`/`as any`/`!.`** — hot spots: `[resource].ts` ~20 casts nos 12 recursos sem validator; `src/pages/agro/*.tsx` `(X as any)` em query results (`tax-obligations:43`, `crop-seasons:29`, `productivity:17,19`, `environmental-licenses:50`, `credit-instruments:56`, `reports:23,25`, `calendar:59`); `src/components/crm/*` `(item:any)` em reduce/map.
- **ALTA · Q-12 · Hooks de lista com tipo ambíguo** — `useAllMatters` retorna às vezes `PaginatedResult<Matter>` às vezes `Matter[]`; componentes fundem com `as any` (`create-matter-form.tsx:30`, `calendar.tsx:59`, `productivity.tsx:17`, `reports.tsx:23`). **Fix:** padronizar retorno dos hooks.
- **MÉDIA · Q-13 · `repository.ts` `rows.map((r) => mapX(r as Record<string, unknown>))`** ~20x — tipar retorno de `getSql()` uma vez.
- **BAIXA · Q-14 · `api/upload.ts:48` `catch (err: any)`** — único `err:any` da API. Usar `unknown`.

**Erros / error handling**

- **MÉDIA · Q-15 · 9 blocos `} catch {` silenciosos** — `sso.ts:52,153,181` (metadata/state/id_token → null sem log); `auth-context.tsx:24` (restoreSession zera sem logar); `document-manager.tsx:147` (R2 falha → "save metadata only", usuário não sabe); `rate-limit.ts:59,82,117`; `json-utils.ts:12`. **Fix:** `console.warn` estruturado nos fallbacks.
- **MÉDIA · Q-16 · `rag.ts:118` fallback vazio silencioso** — embedding search falha → `[]` → Copilot responde sem contexto sem indicar degradação ao usuário.
- **ALTA · Q-17 · Cookie CSRF inconsistente** — `[action].ts:74` grava `agro_csrf; SameSite=Strict` hardcoded; `http.ts:26,28` `csrfCookieName()` = `__Host-agro_csrf` em prod + `SameSite=Lax`. Em prod, `getCsrfCookie` procura `__Host-agro_csrf` → não encontra o cookie gravado. Header `X-CSRF-Token` ainda funciona (cliente lê `csrfToken` da resposta), então impacto limitado ao fallback por cookie. **Fix:** `setCsrfCookie(res, token)` centralizado em `http.ts`.
- **MÉDIA · Q-18 · `[resource].ts:1058` ID `DOC-${Date.now()}`** — colisão em mesmo ms; outras entidades usam `uuidPrefix`. **Fix:** `uuidPrefix("DOC")`. Esforço XS.
- **BAIXA · Q-19 · `console.error` sem logger estruturado** — `upload.ts:48`, `cnpj.ts:115,167,197`. Dívida de observabilidade.

**Inconsistências**

- **MÉDIA · Q-20 · Dois `MAX_PAGE_SIZE`** — `list-query.ts:15`=200 (DB), `list-types.ts:3`=100 (memória). Dev retorna max 100, prod 200. Unificar.
- **ALTA · Q-21 · 12 recursos sem validação de payload** — `documents, document-checklist, time-entries, invoices, fee-agreements, contacts, properties, opposing-parties, tax-obligations, environmental-licenses, credit-instruments, crop-seasons` usam `getBody(req.body) as any`; aceitam enums arbitrários (`status`, `type`, `category`, `phase`, `risk`) corrompendo dados que filtros/stats/audit assumem. Mesma classe do item 2.4 anterior (agora corrigido só para os 7 CRM). **Fix:** estender `validation.ts` aos 12. Esforço M.
- **MÉDIA · Q-22 · Dois padrões de acesso a dados** — 7 CRM usam `data-service` (memory vs db + guard); 12 agrícolas/documentos fazem `await import("../../shared/agro/store.js")` direto (58 dynamic imports), bypassando `data-service`, `assertWritableInProd` e repositório Postgres. Em produção com DB, esses 12 gravam só na memória da instância — perdidos. **Fix:** estender `data-service` aos 12. Esforço L.
- **BAIXA · Q-23 · Políticas de cookie mistas** — `cookieBase()` `SameSite=Lax`; CSRF login `SameSite=Strict`. Unificar.

**Magic numbers**

- **BAIXA · Q-24 · `store.ts` offsets mágicos** — `DL-${length+501}`, `ACT-${length+601}`, `OP-${length+201}` sem constantes nomeadas.
- **BAIXA · Q-25 · `audit.ts:34` `MAX_LOGS=10000`** hardcoded.
- **BAIXA · Q-26 · `DOC-${Date.now()}`** (ver Q-18).

**Store / Serverless**

- **MÉDIA · Q-27 · `store.ts:558` estado mutável module-level** — em serverless: dev (sem DB) cold start recria seed, warm compartilha estado entre usuários; prod com DB popula seed por `structuredClone` (desperdício) e nunca usado pelos 7 CRM, mas usado pelos 12 de Q-22. `auditLogs`, `OIDC_META_CACHE`, `memoryBucket` (rate-limit) também module-level → rate limit por IP por instância (trivial de contornar). `assertWritableInProd` só cobre recursos que passam por `data-service`; os 12 de Q-22 **não passam pelo guard** — gravam na memória em produção sem erro.

**Copilot**

- **MÉDIA · Q-28 · `copilot.ts:522` keyword matcher if-else chain** — `matchPromptId` O(n) por prompt, frágil a sinônimos. **Fix:** tabela `Map<PromptId, string[]>` + scoring, ou RAG real sobre `KNOWLEDGE_DOCUMENTS` (handler já tenta LLM primeiro com fallback keywords).

**Tamanho (linhas)**

| Linhas | Arquivo |
|---|---|
| 1705 | `api/agro/[resource].ts` (Q-1) |
| 1000 | `shared/agro/seed.ts` (OK) |
| 983 | `api/_lib/db/repository.ts` (monolítico) |
| 704 | `api/_lib/data-service.ts` |
| 642 | `src/lib/api/client.ts` |
| 605 | `shared/agro/types.ts` (catálogo, OK) |
| 558 | `shared/agro/store.ts` (Q-27) |
| 522 | `shared/agro/copilot.ts` (Q-28) |
| 508 | `src/hooks/use-crm-queries.ts` |
| 493 | `api/_lib/validation.ts` (17 validators) |

**Testes**

- **ALTA · Q-29 · Lacunas críticas** — sem cobertura para `auth-server.ts` (210 linhas, fix sem regressão), `sso.ts` (188), `csrf.ts`, `rate-limit.ts`, `validation.ts` (493), `audit.ts`, `cnpj.ts` (272), `list-query.ts`, `repository.ts` (983, só mappers testados), `data-service.ts` (704), `date-utils.ts`, todos hooks/components/pages. Existentes: 9 unit + 1 e2e.
- **MÉDIA · Q-30 · E2E só cobre leads** — faltam matter, opportunity (conversão), RBAC negativo (comercial→matters 403).
- **ALTA · Q-31 · Lint já falha no main (139 erros)** — `npm run lint` reporta 139 erros `@typescript-eslint/no-explicit-any` concentrados em `src/pages/agro/*` (productivity, reports, tax-obligations, crop-seasons, environmental-licenses, credit-instruments, calendar) e `api/agro/[resource].ts` (casts dos 12 recursos sem validator, Q-21). A auditoria anterior (12/06) citava "3 warnings" — defasada; os commits P2/P3 adicionaram páginas agro com `as any` e o gate de lint não impediu. Verificar se `.github/workflows/ci.yml` falha o job em erros (aparentemente não está gateando). Recomendação: (a) aplicar E-5/E-20 (validators + schemas tipados) elimina a maioria; (b) garantir que CI falhe em `npm run lint` com erro.

---

## 3. ARQUITETURA E EVOLUÇÃO

### 3.1 O que o projeto faz

CRM jurídico verticalizado para o agronegócio brasileiro. SPA React 19 na Vercel + Serverless Functions. O domínio cobre o funil completo: **Leads → Oportunidades → Contas → Demandas (matters) → Tarefas**, com rastreabilidade (`lead_id` → `opportunity_id` → `converted_opportunity_id`) e entidades complementares: prazos processuais, timeline de atividades, documentos (versionamento + checklist), horas/faturamento, contatos, propriedades rurais, partes contrárias, obrigações tributárias (ITR/ITBI/IPVA), licenças ambientais (LP/LI/LO), crédito rural (CPR/CCB/penhor/alienação fiduciária).

A camada de IA entrega o **Agro Copilot** com pipeline RAG — embeddings sobre `KNOWLEDGE_DOCUMENTS` (23 docs, 10 categorias), similaridade cosseno, prompt com contexto CRM (stats + entidade em foco + resultados RAG), saída estruturada Zod + `Output.object()` (AI SDK v6), fallback determinístico para keyword engine quando nenhum provider LLM está configurado. Há ainda SSO OIDC com PKCE, CSRF tokens, rate limiting, audit log com diff before/after, export CSV por entidade e uma landing institucional em `/institucional`.

A arquitetura é **dual-store**: `shared/agro/store.ts` (memória + seed fictício) e `api/_lib/db/repository.ts` (Neon Postgres), selecionados em runtime por `isDbEnabled()`. O domínio é totalmente compartilhado entre front e back através de `shared/agro/types.ts` (~600 linhas canônicas), eliminando drift de tipos.

### 3.2 Como está estruturado

```
Frontend (src/)
  pages/ (lazy em App.tsx) · components/{crm,agro,command-center,copilot,knowledge,layout,ui,auth}
  hooks/ (TanStack Query) · contexts/ (auth, theme — split value/provider) · lib/api/client.ts
Shared (shared/agro/) — DOMÍNIO CANÔNICO
  types · store · seed · auth(RBAC) · filters · list-types · convert · copilot · knowledge · stats
API (api/)
  agro/[resource].ts (handler único, 17 recursos) · auth/[action].ts · upload · admin/db-setup · health/db
  _lib/{data-service, guard, auth-server, sso, http, csrf, rate-limit, r2, email, cnpj, validation, audit,
        db/{client,repository,migrate,mappers,json-utils}, llm/{providers,embeddings,rag,prompt,schema}}
DB (db/) — schema.sql (canônico futuro, inclui agro.users) · migrate.sql (idempotente, npm run db:setup)
```

**Fluxo lista paginada:** hook → `agroApi.leads` → `GET /api/agro/leads` → `requireAuth` (cookie → `resolveSession` → `verifySignedToken`) → `requireCsrf` → `checkUserRateLimit` → `parseLeadListQuery` → `listLeads` (data-service: `isDbEnabled()? db.dbListLeads : memory.listLeads`) → `json(res, PaginatedResult)` → React Query cache.

**Fluxo auth:** login → rate limit → `authenticate` (USERS.find → scrypt + `timingSafeEqual`) → `signToken` HMAC → cookie `__Host-agro_session` HttpOnly+Secure+SameSite=Lax + cookie CSRF. SSO: `sanitizeFrom` → PKCE S256 → state+nonce HMAC → redirect IdP → callback valida state cookie → `exchangeSsoCode` → `validateIdToken` (**sem JWKS**) → `findUserByEmail` → issue session.

**Fluxo RAG:** `POST /api/agro/copilot` → `loadCrmDataset()` (SELECT * 7 tabelas) → `computeCrmStats` → se sem config LLM: keyword engine (simulado); senão `searchKnowledge` (embeddings lazy + cache module-level + cosine) → `buildSystemPrompt` → `generateText + Output.object(CopilotResponseSchema)` → fallback keyword on error.

### 3.3 Dívida arquitetural

**Alta**

- **A-1 · Audit bifurcado e silenciosamente ineficaz em prod** — handler usa `auditCreate/Update/Delete` in-memory, nunca `recordAudit` (`data-service.ts:450` → DB). `agro.audit_logs` vazio em prod. (== S-6/Q-4)
- **A-2 · RAG cache efêmero e caro** — `rag.ts:18` `embeddingCache` module-level; cada cold start regenera embeddings (chamadas pagas) e perde em warm-down. Sem pgvector, RAG só funciona em instâncias warm. Dívida reconhecida inline (`rag.ts:7`).
- **A-3 · id_token SSO sem verificação criptográfica** (== S-1).

**Média**

- **A-4 · `loadCrmDataset()` full-scan por request** — `data-service.ts:402-411` SELECT * em 7 tabelas sem WHERE + `computeCrmStats` em JS. Cada `/stats` e `/copilot` varre o banco. Sem cache, sem materialized view, sem agregação SQL.
- **A-5 · Facets re-executam SELECT sem WHERE** — `repository.ts:88-92,184-188,332-336,385-389,434-438` re-SELECT * + facets em JS. N+1 desnecessária.
- **A-6 · 12 entidades só no memory store em prod** (== Q-22) — `documents`, `time_entries` são críticos para operação jurídica.
- **A-7 · Handler único de 1705 linhas** (== Q-1) — cold start pesado, difícil de testar, merge conflict. Motivação legítima (limite de 12 functions do plano Hobby); solução = dispatcher enxuto + handlers por resource (cada arquivo vira uma function, dentro do limite).
- **A-8 · Schema-vs-types drift** — `schema.sql:49-56` define `agro.users` (UUID, password_hash) mas `auth-server.ts` usa `USERS[]` hardcoded lendo env — a tabela nunca é lida. `types.ts:186` typo `DocumentCategory = " despacho"` (espaço à esquerda). `DocumentVersion`, `Contact`, `Property`, `OpposingParty`, `TimeEntry`, `Invoice`, `FeeAgreement`, `TaxObligation`, `EnvironmentalLicense`, `CreditInstrument`, `CropSeason` estão em types mas sem tabela em `schema.sql`.

**Baixa**

- IDs `crypto.randomUUID()` + prefixo — OK (sem colisão). `agro.leads.created_at` é DATE não TIMESTAMPTZ — inconsistente, perde hora. `generateStructured` em `providers.ts` dead (Q-10). 3 warnings lint resolvidos. CI não roda e2e nem migração. Sem observabilidade (Sentry/structured logging). `pageSize` cap no repository mas não declarado na contract de validation.

### 3.4 Sugestões de evolução (prioridade · esforço · arquivos)

| # | Sugestão | Prio | Esforço | Arquivos |
|---|---|---|---|---|
| E-1 | **Validar assinatura id_token via JWKS** (`jose` + `createRemoteJWKSet`) | P0 | S | `sso.ts`, `package.json` |
| E-2 | **Wire audit ao DB**: trocar `auditCreate/Update/Delete` por `recordAudit`; estender `agro.audit_logs` com `before/after/changes` JSONB + IP + chain hash; migrar `queryAuditLogs`/`getAuditStats` SQL | P0 | M | `audit.ts`, `[resource].ts`, `repository.ts`, `migrate.sql` |
| E-3 | **Remover senhas do README + girar prod** | P0 | XS | `README.md` |
| E-4 | **`resolveSession` guard `isProduction()`** + sanitizar `prefix` R2 + fix CORS fallback | P0 | XS | `auth-server.ts`, `r2.ts`, `[resource].ts` |
| E-5 | **Validators para 12 recursos restantes** (estender `validation.ts`) | P0 | M | `validation.ts`, `[resource].ts` |
| E-6 | **pgvector + persistência de embeddings**: `CREATE EXTENSION vector`; tabela `agro.kb_embeddings(doc_id PK, embedding VECTOR(1536), text, updated_at)`; pré-computar em `db:setup`; consulta `<=>` cosine; chunking por seção | P1 | M | `rag.ts`, `embeddings.ts`, `migrate.sql`, `schema.sql`, `repository.ts` |
| E-7 | **Migrar 12 entidades a Postgres** (priorizar `documents`, `time_entries`): tabela + `dbList/Get/Create/Update/Delete` + ramo DB em data-service + apagar fallback memory | P1 | L | `schema.sql`, `migrate.sql`, `repository.ts`, `mappers.ts`, `data-service.ts`, `store.ts` |
| E-8 | **Stats SQL nativo**: `COUNT(*) FILTER`, `SUM FILTER`, `jsonb_agg` substituindo `loadCrmDataset+computeCrmStats`; cache 60s edge / `staleTime` maior | P1 | M | `repository.ts`, `data-service.ts`, `stats.ts` |
| E-9 | **Facets via `GROUP BY`** SQL | P1 | M | `repository.ts`, `filters.ts` |
| E-10 | **OIDC logout (RP-initiated)** + `userinfo_endpoint` | P1 | S | `sso.ts`, `[action].ts` |
| E-11 | **`agro.users` no DB + senhas por usuário**: `dbFindUserByEmail`, `dbGetUserPasswordHash`; seed 3 users com scrypt + salt aleatório | P1 | M | `auth-server.ts`, `repository.ts`, `schema.sql`, `scripts/db-setup.ts` |
| E-12 | **Dispatcher + handlers por resource** (split `[resource].ts`) | P2 | M | `api/agro/*`, `vercel.json` |
| E-13 | **Query builder tipado** (`drizzle-orm` ou `kysely`) | P2 | L | `api/_lib/db/*`, `package.json` |
| E-14 | **Observabilidade**: Sentry serverless+react, `pino`, `X-Request-Id` correlação | P2 | M | `http.ts`, `[resource].ts`, `main.tsx` |
| E-15 | **E2E matters/opportunities/RBAC** + contract tests | P2 | M | `e2e/*`, `playwright.config.ts` |
| E-16 | **CI e2e + migration test** contra Neon ephemeral branch + preview comment | P2 | S | `.github/workflows/*` |
| E-17 | **Citações `[KB-XXX]` no Copilot**: schema Zod refine + chips clicáveis | P2 | S | `llm/schema.ts`, `llm/prompt.ts`, `copilot-response-card.tsx` |
| E-18 | **`<EntityDetailLayout>`** DRY detail pages | P2 | M | `src/pages/crm/*-detail.tsx` |
| E-19 | **Índices**: `idx_leads_status`, `idx_opportunities_stage`, `idx_matters_status/risk`, `idx_tasks_status/priority`, `idx_*_created_at DESC` | P2 | S | `migrate.sql`, `schema.sql` |
| E-20 | **`<EntityForm>`** com `react-hook-form`+`zodResolver`; schemas compartilhados `shared/agro/schemas.ts` (elimina drift validação front/back) | P3 | M | `src/components/crm/*-form.tsx`, `validation.ts` |
| E-21 | **Sequences para IDs legados** (`agro.entity_sequences`, `INSERT…ON CONFLICT DO UPDATE`) | P3 | S | `repository.ts`, `migrate.sql` |
| E-22 | **`updated_at` trigger** | P3 | S | `migrate.sql` |
| E-23 | **Virtualização de listas** (`@tanstack/react-virtual`) — prematuro hoje | P3 | S | `entity-table.tsx` |
| E-24 | **Optimistic updates** (`onMutate`+`setQueryData`) | P3 | S | `use-crm-queries.ts` |
| E-25 | **Corrigir typo `DocumentCategory " despacho"`** + migration normalize | P3 | XS | `types.ts`, `migrate.sql` |
| E-26 | **Remover dead code** (Q-6..Q-10) | P3 | XS | vários |
| E-27 | **CSP estrito** (relaxar `style-src 'unsafe-inline'` via nonce build-time) | P3 | M | `vercel.json`, `vite.config.ts`, `index.html` |
| E-28 | **`undici` override bump** (CVE-2025-22150) | P1 | XS | `package.json` |
| E-29 | **Unificar `MAX_PAGE_SIZE`** + **`setCsrfCookie` centralizado** + **`uuidPrefix("DOC")`** | P1 | XS | `list-types.ts`, `http.ts`, `[action].ts`, `[resource].ts` |
| E-30 | **Testes mínimos**: `auth-server`, `validation`, `sso`, `csrf`, `rate-limit` | P1 | M | `*.test.ts` novos |

### 3.5 Veredito

A codebase evoluiu muito desde 12/06: todos os itens críticos de auth/SSO/CSRF/headers/CI/conteúdo foram endereçados. **Pronto para dados reais após P0+P1.** A dívida restante concentra-se em: (a) auditoria não persistida, (b) 12 entidades ainda em memória, (c) RAG sem pgvector, (d) full-scan em stats, (e) validação criptográfica do id_token, (f) 12 recursos sem validator de payload. Nenhuma dessas é bloqueadora para uso interno, mas todas se tornam agudas antes de multi-inquilino ou volume produtivo.

---

## Priorização consolidada (top → bottom)

**P0 — corrigir agora (segurança/correção):**
1. E-1 JWKS id_token (S-1) — CRÍTICA
2. E-3 remover senhas README + girar (S-2) — ALTA
3. E-2 audit ao DB (S-6/Q-4/A-1) — ALTA
4. E-5 validators 12 recursos (Q-21) — ALTA
5. E-4 guards (resolveSession prod, R2 prefix, CORS) (S-3/S-4/S-5) — MÉDIA

**P1 — antes de dados reais:**
6. E-7 migrar 12 entidades a Postgres (Q-22/A-6) — ALTA
7. E-6 pgvector + embeddings persistentes (A-2) — ALTA
8. E-8 stats SQL nativo (A-4) — MÉDIA
9. E-9 facets GROUP BY (A-5) — MÉDIA
10. E-11 users no DB (A-8) — MÉDIA
11. E-28 undici bump, E-29 unificar pageSize/csrf cookie/DOC-id, E-30 testes mínimos — MÉDIA

**P2 — qualidade/escala:**
12. E-12 dispatcher split (Q-1/A-7), E-13 query builder, E-14 observabilidade, E-15/E-16 E2E+CI, E-17 citações, E-18 detail DRY, E-19 índices

**P3 — polish:**
13. E-20..E-27 forms, sequences, triggers, virtualização, optimistic, typo, dead code, CSP

---

## Verificação (pós-implementação, quando aplicável)

- `npm run typecheck` limpo
- `npm run lint` sem warnings
- `npm run test` (unit) verde — adicionar testes E-30
- `npm run test:e2e` (smoke + novos E2E E-15)
- `npm run build` ok
- Para SSO (E-1): fluxo completo contra IdP real (Azure/Google) — callback valida assinatura JWKS
- Para audit (E-2): operação CRUD → row em `agro.audit_logs` com diff + IP
- Para 12 entidades (E-7): escrita em prod com `DATABASE_URL` → persiste; sem `DATABASE_URL` → 503 do guard
- Para pgvector (E-6): cold start não regenera embeddings; consulta `<=>` retorna top-5

---

## Notas

- CodeGraph não inicializado neste projeto (`codegraph init -i` disponível se desejar índice estrutural para próximas auditorias).
- Auditoria prévia `AUDITORIA-2026-06-12.md` mantida no repo para histórico.