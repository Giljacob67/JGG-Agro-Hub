# Relatório de Auditoria Completa — JGG Agro Hub

**Data:** 2026-06-22
**Escopo:** varredura completa (segurança, qualidade/consistência, arquitetura/evolução)
**Método:** leitura direta de todos os módulos + 3 agentes paralelos (frontend, backend, shared/scripts). Nenhum arquivo foi alterado.

---

## Sumário Executivo

| Frente | Achados | Críticos | Altos | Médios | Baixos |
|---|---|---|---|---|---|
| Segurança | 16 | 2 | 4 | 5 | 5 |
| Qualidade/Consistência | 18 | 2 | 4 | 7 | 5 |
| Arquitetura e Evolução | 14 | 2 | 4 | 5 | 3 |
| **Total** | **48** | **6** | **12** | **17** | **13** |

## Legenda de Severidade

| Nível | Significado |
|---|---|
| 🔴 CRÍTICA | Exploração direta, perda de dado ou quebra de negócio core. Corrigir imediatamente. |
| 🟠 ALTA | Risco real sob condição plausível; corrigir no curto prazo (1-2 sprints). |
| 🟡 MÉDIA | Fragilidade ou dívida técnica que vai morder; planejar correção. |
| 🔵 BAIXA | Higiene, footgun latente ou melhoria de DX. |

## Stack e Métricas

```
Frontend: React 19 + Vite 8 + TailwindCSS 4 + wouter + TanStack Query v5
Backend:  Vercel Serverless Functions (4 rotas consolidadas)
Database: Neon PostgreSQL (memory fallback)
AI:       Vercel AI SDK v6 (OpenAI, Anthropic, Google, Ollama)
Storage:  Cloudflare R2 (presigned URLs)
Email:    Resend API
Auth:     scrypt + HMAC-SHA256 tokens
Cache:    Upstash Redis (fallback in-memory)

LOC total: ~24.200 (13.7k frontend + 8.7k API + 1.8k shared)
Arquivos >300 linhas: 19
Dependências npm: 22 (prod) + 17 (dev)
Testes: 43 unit + 3 e2e (cobertura estimada: ~15%)
```

---

# PARTE 1 — SEGURANÇA

## 🔴 SEC-01 — Token de sessão forjável em dev/staging
`shared/agro/auth.ts:43-46` · `api/_lib/auth-server.ts:194-197`

O token de sessão no browser é `btoa(JSON.stringify(payload))` — sem assinatura. Qualquer pessoa pode forjar um token `{"role":"gestao","exp":9999999999999}` em uma linha de console. O `resolveSession` do servidor cai neste path quando `AUTH_SECRET` está ausente e não está em produção Vercel (linha 194-197):

```ts
if (process.env.VERCEL_ENV) return null;
const devUser = verifySignedToken(token, "dev-insecure");
if (devUser) return devUser;
return resolveDevSession(token); // ← aceita token base64 puro
```

Em **preview deployments** (`VERCEL_ENV=preview`) o código retorna `null` — correto. Mas em staging não-Vercel (Docker, VM local com `VERCEL_ENV` ausente), o token é forjável.

**Correção:** remover `resolveDevSession` do fallback. Em qualquer ambiente sem `AUTH_SECRET`, recusar autenticar. O `DEV_PASSWORD` em `auth.ts:11` (`"jgg-agro-dev"`) é público no repositório.

**Esforço:** Pequeno (~1h) · **Prazo:** Imediato

---

## 🔴 SEC-02 — Injeção de HTML em templates de email
`api/_lib/email.ts:106-111`

`options.event`, `options.title`, `options.description` e `options.url` são interpolados diretamente em HTML sem escaping:

```ts
`<p style="...">${options.event}</p>`
`<h2 ...>${options.title}</h2>`
`<a href="${options.url}" ...>`
```

Se dados controlados pelo usuário fluem para esses campos, um atacante pode injetar HTML/JavaScript arbitrário em notificações email. O campo `url` é particularmente perigoso — pode injetar `javascript:` URIs ou quebrar o atributo `href`.

**Correção:** escapar HTML em todos os campos interpolados (`&` → `&amp;`, `<` → `&lt;`, `"` → `&quot;`). Validar que `url` começa com `https://`.

**Esforço:** Pequeno (~1h) · **Prazo:** Imediato

---

## 🟠 SEC-03 — Rate-limit ausente em endpoints caros/sensíveis
`api/agro/[resource].ts`

`checkUserRateLimit` é aplicado em leads, accounts, opportunities, matters, tasks, deadlines, crop-seasons, tax-obligations, environmental-licenses e credit-instruments. Porém os seguintes recursos **não têm rate-limit por usuário**:

| Recurso | Risco | Config existe? |
|---|---|---|
| `copilot` (linha 757) | Chamadas LLM custosas | `copilot: 10 req/min` definido mas **nunca usado** |
| `email` (linha 1084) | Envio de email em massa | ❌ |
| `lookup` (linha 1138) | Chamada a APIs externas (CNPJ/CPF) | ❌ |
| `documents` (linha 1180) | Upload/storage | ❌ |
| `time-entries` (linha 1295) | Escrita financeira | ❌ |
| `invoices` (linha 1348) | Escrita financeira | ❌ |
| `knowledge` (linha 943) | Embeddings LLM | ❌ |
| `audit` (linha 1032) | Leitura potencialmente pesada | ❌ |

**Correção:** aplicar `checkUserRateLimit(user.id, "copilot")` no copilot; criar tiers `email`, `lookup`, `financeiro` e aplicar nos demais.

**Esforço:** Pequeno (~2h) · **Prazo:** Esta semana

---

## 🟠 SEC-04 — Upload R2 sem CSRF e sem validação de tipo/tamanho
`api/upload.ts`

1. **Sem `requireCsrf()`** — um site malicioso pode fazer upload em nome de usuário autenticado
2. **Sem allowlist de `contentType`** — aceita qualquer MIME type
3. **Sem limite de tamanho** — permite upload arbitrário
4. `fileName` e `prefix` não são validados contra path traversal

**Correção:** adicionar `requireCsrf()`, allowlist de MIME types, limite de tamanho (ex: 50MB), sanitizar `prefix`.

**Esforço:** Pequeno (~2h) · **Prazo:** Esta semana

---

## 🟠 SEC-05 — Autorização genérica: 10 recursos sob permissão `"leads"`
`api/agro/[resource].ts`

Recursos sensíveis usam `requireAuth(req, res, "leads")` para autorização:

- `documents`, `document-checklist`, `time-entries`, `invoices`, `fee-agreements`, `contacts`, `properties`, `opposing-parties`, `conflict-check`, `lookup`

Isso significa que mudanças na lógica de permissão de "leads" afetam inadvertidamente dados financeiros e jurídicos. O perfil `comercial` ganha acesso a faturas, honorários e documentos.

**Correção:** criar recursos dedicados no `PERMISSIONS` matrix: `financeiro`, `documentos`, `contatos`, `propriedades`, `conflitos`.

**Esforço:** Médio (~1-2 dias) · **Prazo:** Esta semana

---

## 🟠 SEC-06 — `upload.ts` aceita `contentType` do usuário para presign R2
`api/upload.ts` · `api/_lib/r2.ts`

O `contentType` do body é passado diretamente para a geração da presigned URL. Um usuário pode presignar URLs para upload de executáveis, HTML (para stored XSS via R2), ou outros tipos perigosos.

**Correção:** allowlist de tipos permitidos (PDF, DOC, DOCX, JPG, PNG, XLS, XLSX, CSV).

**Esforço:** Pequeno (~30min) · **Prazo:** Esta semana

---

## 🟡 SEC-07 — Segredos com fallback hardcoded
`api/_lib/csrf.ts:26` · `api/_lib/sso.ts:210` · `api/_lib/auth-server.ts:54,76,161`

| Arquivo | Segredo hardcoded | Quando usado |
|---|---|---|
| `csrf.ts:26` | `"jgg-csrf-dev-secret"` | `CSRF_SECRET` ausente |
| `sso.ts:210` | `"dev-insecure"` | `AUTH_SECRET` ausente |
| `auth-server.ts:54` | `"agro-jgg-salt-v1"` | `AUTH_PASSWORD_SALT` ausente + sem `AUTH_SECRET` |
| `auth-server.ts:76` | hash de `"jgg-agro-dev"` | Sem `AUTH_SECRET` |
| `auth-server.ts:161` | `"dev-insecure"` | Sem `AUTH_SECRET` |

Todos são gated por verificações de ambiente, mas estão no código-fonte público.

**Correção:** falhar fechado (lançar erro) na ausência de segredo em qualquer deploy. Em dev, usar `.env.local` que não é commitado.

**Esforço:** Pequeno (~1h) · **Prazo:** Próxima sprint

---

## 🟡 SEC-08 — `distinctSorted`: interpolação SQL sem allowlist
`api/_lib/db/repository.ts:1343-1359`

```ts
`SELECT DISTINCT ${column} AS v FROM ${table} ${where} AND ${column} IS NOT NULL ORDER BY ${column}`
```

`table` e `column` são interpolados diretamente. Hoje só recebe literais, mas é footgun de SQLi.

**Correção:** allowlistar identificadores em `Record<string, string>`.

**Esforço:** Pequeno (~30min) · **Prazo:** Próxima sprint

---

## 🟡 SEC-09 — Error messages vazam detalhes internos
`api/health/db.ts:14-23` · `api/upload.ts:46`

Mensagens de erro do banco são retornadas diretamente ao cliente:
```ts
error: err instanceof Error ? err.message : "Erro de conexão"
```

**Correção:** retornar mensagem genérica; logar detalhe server-side.

**Esforço:** Pequeno (~30min) · **Prazo:** Próxima sprint

---

## 🟡 SEC-10 — Token HMAC caseiro sem iat/jti/revogação
`api/_lib/auth-server.ts:91-121`

`signToken` monta `base64url(JSON).hmac` manualmente. Sem `iat`, `jti`, nem versionamento de algoritmo — não é possível revogar tokens nem detectar replay. A biblioteca `jose` já é dependência.

**Correção:** migrar para `jose.SignJWT`/`jwtVerify` com `iat`, `jti`, `alg` header.

**Esforço:** Médio (~1 dia) · **Prazo:** Backlog

---

## 🔵 SEC-11 — CSP com `unsafe-inline` para estilos
`vercel.json:61`

`style-src 'self' 'unsafe-inline'` é necessário para Tailwind mas enfraquece mitigação de XSS. `script-src` está correto (sem `unsafe-inline`).

**Correção:** considerar nonce-based CSP ou Tailwind com hash.

**Esforço:** Alto · **Prazo:** Backlog

---

## 🔵 SEC-12 — CI sem varredura de segurança
`.github/workflows/ci.yml`

Pipeline faz typecheck/lint/test/build mas não roda `npm audit`, secret-scanning, nem SAST.

**Correção:** adicionar step `npm audit --audit-level=high` e habilitar Dependabot.

**Esforço:** Pequeno (~1h) · **Prazo:** Backlog

---

## 🔵 SEC-13 — Token em localStorage (legado dev)
`src/lib/api/client.ts:15-27`

`getAuthToken`/`setAuthToken` (`@deprecated`) ainda gravam em `localStorage` — exfiltrável por XSS. Exercitado apenas no mock dev.

**Correção:** remover funções legadas.

**Esforço:** Pequeno (~30min) · **Prazo:** Backlog

---

## 🔵 SEC-14 — `console.warn` em código de produção
`src/components/crm/document-manager.tsx:143`

`console.warn("R2 not configured, saving metadata only")` expõe detalhe de infraestrutura no console do browser.

**Correção:** remover ou usar logger silencioso.

**Esforço:** Pequeno (~5min) · **Prazo:** Backlog

---

## 🔵 SEC-15 — Validação de input fraca no frontend
`contact-manager.tsx` — CPF/email/telefone sem validação. `cnpj-lookup.tsx:46` — valida só 14 dígitos sem dígito verificador. API client não valida formatos de ID antes de enviar.

**Correção:** adicionar validação client-side para UX (Zod ou máscaras).

**Esforço:** Médio · **Prazo:** Backlog

---

# PARTE 2 — QUALIDADE / CONSISTÊNCIA

## 🔴 QUAL-01 — 97 ocorrências de `any` — type safety anulado
`src/lib/api/client.ts:540-675` · `src/pages/agro/*.tsx` · `src/components/crm/*.tsx`

A segunda metade do API client (~40 métodos) retorna `Promise<any>`:
- `listDocuments`, `createDocument`, `listDocumentChecklist`, `listTimeEntries`, `createTimeEntry`, `listInvoices`, `createInvoice`, `listFeeAgreements`, `listContacts`, `createContact`, `listProperties`, `createProperty`, `listOpposingParties`, `listCropSeasons`, `listTaxObligations`, `listEnvironmentalLicenses`, `listCreditInstruments` — **todos `request<any>`**

Páginas usam casts massivos:
- `reports.tsx` — 13 `any` casts
- `tax-obligations.tsx` — 12 `any` casts
- `environmental-licenses.tsx` — 10 `any` casts
- `credit-instruments.tsx` — 10 `any` casts
- `productivity.tsx` — 6 `any` casts

Resultado: bugs silenciosos como `e.billed` (inexistente) em vez de `e.invoiced`.

**Correção:** tipar todos os métodos do client com tipos de `@shared/agro/types`. Eliminar `as any` em páginas.

**Esforço:** Alto (~3-4 dias) · **Prazo:** Próxima sprint

---

## 🔴 QUAL-02 — 8 entidades sem persistência em DB (perda de dados em produção)
`api/agro/[resource].ts` → `shared/agro/store.ts`

As seguintes entidades escrevem **direto no store em memória**, sem branch para DB:

| Entidade | Linha no handler | Tem tabela DB? |
|---|---|---|
| `documents` | 1180 | ❌ |
| `document-checklist` | 1252 | ❌ |
| `time-entries` | 1295 | ❌ |
| `invoices` | 1348 | ❌ |
| `fee-agreements` | 1385 | ❌ |
| `contacts` | 1410 | ❌ |
| `properties` | 1452 | ❌ |
| `opposing-parties` | 1494 | ❌ |

Em produção com `DATABASE_URL` configurado, `guardWrite` passa (só checa `isDbEnabled()` globalmente) — a escrita retorna `201` mas vive apenas na instância serverless atual. **Dados financeiros e documentais são perdidos a cada cold start.**

**Correção:** estender `repository.ts` + `data-service.ts` com tabelas/funções. Enquanto isso, `guardWrite` deve bloquear por recurso quando não há tabela.

**Esforço:** Alto (~3-5 dias) · **Prazo:** Imediato

---

## 🟠 QUAL-03 — Handler monolítico de 1.700+ linhas
`api/agro/[resource].ts`

O handler `if (resource === "X")` contém ~20 blocos repetindo o mesmo padrão:
```
auth → guardWrite → rate-limit → validate → CRUD → audit
```

~1.500 LOC de boilerplate quase idêntico. Alto custo de manutenção e fácil divergência (copilot esqueceu rate-limit; documents chama requireCsrf redundante).

**Correção:** extrair resource registry:
```ts
const RESOURCES: Record<string, { permission: string; handlers: CrudHandlers; auditType: string }> = { ... }
```
Dispatcher genérico colapsa ~1.500 → ~400 LOC.

**Esforço:** Médio (~2-3 dias) · **Prazo:** Próxima sprint

---

## 🟠 QUAL-04 — `repository.ts` monolítico com 2.400+ linhas e 80+ funções
`api/_lib/db/repository.ts`

Funções CRUD por entidade com padrão idêntico (List/Get/Create/Patch/Delete), mesma lógica de paginação, mesmo `WHERE deleted_at IS NULL`. Compartilham 80%+ de estrutura.

**Correção:** split em arquivos por entidade ou criar repositório CRUD genérico parametrizado.

**Esforço:** Médio (~2 dias) · **Prazo:** Próxima sprint

---

## 🟠 QUAL-05 — Duplicação de funções de formatação
`src/lib/crm-labels.ts:145-162` vs `src/lib/format-utils.ts:8-22` vs `src/components/crm/time-entry-manager.tsx:66`

| Função | Localização 1 | Localização 2 | Localização 3 |
|---|---|---|---|
| `formatDate` | `crm-labels.ts:160` (com T12:00:00) | `format-utils.ts:18` (split manual) | — |
| `formatBrl`/`formatCurrency` | `crm-labels.ts:145` (maxFractionDigits: 0) | `format-utils.ts:8` (sem limit) | `time-entry-manager.tsx:66` (inline) |

Implementações divergem em comportamento (timezone, casas decimais).

**Correção:** consolidar em `format-utils.ts`, remover duplicatas.

**Esforço:** Pequeno (~1h) · **Prazo:** Esta semana

---

## 🟠 QUAL-06 — Mock API de 519 linhas no bundle de produção
`src/lib/api/local-handlers.ts`

Implementa REST API completa (auth, CRUD, paginação, filtros, business logic) no browser. Quando `VITE_USE_API !== "true"`, o código é importado e bundled em produção. Aumenta o tamanho do bundle e mistura concerns client/server.

**Correção:** usar `import.meta.env.DEV` guard ou dynamic import para tree-shaking em produção.

**Esforço:** Pequeno (~1h) · **Prazo:** Próxima sprint

---

## 🟡 QUAL-07 — Tratamento de erro frágil: 13+ catch blocks silenciosos
Múltiplos arquivos

```ts
catch {} // engole erro completamente
catch { toast.error("Erro ao criar X") } // sem detalhe
```

| Arquivo | Linha | Contexto |
|---|---|---|
| `auth-context.tsx` | 24 | Session restore |
| `login.tsx` | 39 | Login |
| `create-lead-form.tsx` | 49 | Criação de lead |
| `create-task-form.tsx` | 36 | Criação de task |
| `create-matter-form.tsx` | 54 | Criação de demanda |
| `create-opportunity-form.tsx` | 40 | Criação de oportunidade |
| `create-account-form.tsx` | 38 | Criação de conta |
| `document-manager.tsx` | 147, 160 | Upload e save |
| `crop-seasons.tsx` | 48 | CRUD safra |
| `tax-obligations.tsx` | 70 | CRUD tributos |
| `environmental-licenses.tsx` | 76 | CRUD licenças |
| `credit-instruments.tsx` | 80 | CRUD crédito |

Nenhum loga o erro ou fornece diagnóstico.

**Correção:** toast com mensagem do erro; logar no backend; distinguir "DB indisponível" de "não encontrado".

**Esforço:** Médio (~1 dia, espalhado) · **Prazo:** Próxima sprint

---

## 🟡 QUAL-08 — Páginas P3 quase idênticas (~800 LOC duplicadas)
`src/pages/agro/{tax-obligations,environmental-licenses,credit-instruments,crop-seasons}.tsx`

4 páginas de ~200 LOC com a mesma estrutura: header + KPIs + filtro + lista + form. `STATUS_ICONS`, `STATUS_COLORS`, `STATUS_LABELS` copiados localmente. CSS classes idênticas aparecem 29+ vezes (selects) e 101+ vezes (labels).

**Correção:** `<ResourceListPage>` genérico + `StatusBadge` + `FormField` componentes reutilizáveis.

**Esforço:** Médio (~2 dias) · **Prazo:** Backlog

---

## 🟡 QUAL-09 — Monólito de hooks: 508 linhas em `use-crm-queries.ts`
`src/hooks/use-crm-queries.ts`

30+ hooks para todas as entidades CRM em um único arquivo. `crmKeys` factory é bem estruturada, mas o arquivo é grande demais.

**Correção:** split em `use-leads.ts`, `use-accounts.ts`, `use-matters.ts`, etc.

**Esforço:** Pequeno (~2h) · **Prazo:** Backlog

---

## 🟡 QUAL-10 — API client god object: 686 linhas, ~50 métodos
`src/lib/api/client.ts`

Um único objeto `agroApi` com ~50 métodos. Mistura concerns: auth, CRM, knowledge, copilot, documents, properties, tax, environmental, credit. Métodos inline com `import()` types difíceis de ler.

**Correção:** split por domínio: `crm-client.ts`, `document-client.ts`, `finance-client.ts`, etc.

**Esforço:** Médio (~1-2 dias) · **Prazo:** Backlog

---

## 🟡 QUAL-11 — Código deprecado ainda em uso
| Item | Localização | Status |
|---|---|---|
| `getAuthToken()`/`setAuthToken()` | `client.ts:14-23` | `@deprecated`, ainda chamado na linha 66 |
| `MAIN_NAV` | `navigation.ts:97-101` | `@deprecated`, ainda exportado |
| `acceptToken` | `auth-context-value.ts:8-9` | `@deprecated`, usado em `login.tsx:28` e `auth-context.tsx:56` |

**Correção:** remover exports deprecados e refatorar callers.

**Esforço:** Pequeno (~1h) · **Prazo:** Backlog

---

## 🟡 QUAL-12 — `process.env` disperso sem validação centralizada
69 acessos diretos a `process.env.*` espalhados pela API. Sem config module que valide variáveis obrigatórias no startup.

**Correção:** criar módulo `config.ts` com validação Zod no cold start. Variáveis ausentes = erro imediato, não runtime failure.

**Esforço:** Pequeno (~2h) · **Prazo:** Backlog

---

## 🔵 QUAL-13 — Formulários de criação com padrão repetido
5 formulários (`create-lead-form`, `create-account-form`, `create-opportunity-form`, `create-matter-form`, `create-task-form`) seguem o mesmo padrão: `useState` → `handleSubmit` → `toast` → reset.

**Correção:** extrair hook `useCreateForm<T>` ou componente genérico.

**Esforço:** Médio · **Prazo:** Backlog

---

## 🔵 QUAL-14 — `request()` assume JSON, quebra em respostas não-JSON
`src/lib/api/client.ts:76`

```ts
const data = await res.json();
```

Se o servidor retorna HTML (502/503 de proxy), `res.json()` lança `SyntaxError` com mensagem confusa.

**Correção:** verificar `Content-Type` antes de parsear; fallback para texto.

**Esforço:** Pequeno (~30min) · **Prazo:** Backlog

---

## 🔵 QUAL-15 — `useCrmListPage` com estado que cresce indefinidamente
`src/hooks/use-crm-list-page.ts:5`

`pageByFilter` cresce conforme combinações de filtros mudam — chaves antigas nunca são limpas.

**Correção:** limitar tamanho do Map ou usar LRU.

**Esforço:** Pequeno (~30min) · **Prazo:** Backlog

---

## 🔵 QUAL-16 — Rotas hardcoded como strings em App.tsx
`src/App.tsx:120,127,134,141`

Rotas como `/agro/crm/leads/:id` são strings hardcoded, mas o objeto `ROUTES` tem funções `leadDetail(id)`. Se rotas mudarem, `ROUTES` e `App.tsx` divergem.

**Correção:** usar `ROUTES.crm.leadDetail(":id")` nas definições de rota.

**Esforço:** Pequeno (~30min) · **Prazo:** Backlog

---

## 🔵 QUAL-17 — `Object.assign` no store permite sobrescrever `id`
`shared/agro/store.ts:140` e similares

```ts
Object.assign(account, patch);
```

`patch` é `Partial<Account>` que inclui `id`. Nada impede `patchAccount("AC-101", { id: "AC-HACKED" })`.

**Correção:** desestruturar `id` e `createdAt` do patch antes do assign.

**Esforço:** Pequeno (~30min) · **Prazo:** Backlog

---

## 🔵 QUAL-18 — URL hardcoded de aplicação externa
`src/lib/brand.ts:12`

```ts
JGG_TRIBUTARIO_URL = "https://tax-group-hub.vercel.app"
```

**Correção:** mover para variável de ambiente.

**Esforço:** Pequeno (~15min) · **Prazo:** Backlog

---

# PARTE 3 — ARQUITETURA E EVOLUÇÃO

## Diagnóstico Estrutural

O projeto é um CRM jurídico-agro bem fatiado com arquitetura limpa:
- **Frontend:** pages → hooks → api-client → handlers (lazy loading, error boundary, React Query)
- **API:** serverless → data-service → repository/store
- **Shared:** tipos, store, RBAC, copilot, seed data

**Pontos fortes:** react-query com cache keys, RBAC default-deny, cookies `__Host-` HttpOnly, JWKS via `jose`, audit com hash-chain, rate-limit distribuído, validação de input extensiva via Zod-like validators.

**Ponto fraco transversal:** dualidade DB ↔ memória mal contida. 11 entidades funcionam em memória, 8 sem tabela DB. Lógica de domínio dependente do fuso da máquina.

---

## 🔴 ARQ-01 — Cálculo de prazos processuais incorreto
`shared/agro/deadline-calculator.ts`

Para um CRM jurídico, este é o achado de maior impacto de negócio:

1. **Feriados hardcoded só até 2026** — tabela expira em meses
2. **`isHoliday` compara em UTC** (`toISOString()`) enquanto `isWeekend` usa horário local — divergência browser vs server
3. **Ignora recesso forense** (20/12–20/01, CPC art. 220)
4. **Ignora feriados estaduais/municipais**
5. **Bug:** `type === "custom" && customDays` trata `0` como ausente (falsy)

**Correção:**
- Módulo de calendário forense com fonte atualizável (tabela DB ou API)
- Cálculo em `America/Sao_Paulo` via `Intl.DateTimeFormat`
- Incluir recesso forense
- `now` injetável para testabilidade
- Tabela de feriados move para DB com seed anual

**Esforço:** Médio (~2-3 dias) · **Prazo:** Imediato

---

## 🔴 ARQ-02 — Lógica de domínio dependente do fuso horário da máquina
`shared/agro/date-utils.ts:3-16` · `shared/agro/convert.ts:25-30`

`isOverdue`, `isWithinDays`, `dueDate` usam `getFullYear()`, `getDay()`, `setHours(0,0,0,0)` — fuso do usuário no browser, UTC no container serverless. Mesmo input gera resultados divergentes.

**Correção:** todas as datas devem usar `Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo'})` ou biblioteca como `date-fns-tz`. Funções puras com `now` como parâmetro.

**Esforço:** Médio (~1 dia) · **Prazo:** Próxima sprint

---

## 🟠 ARQ-03 — Geração de IDs por `array.length` — colisão garantida
`shared/agro/store.ts:213,233,245`

```ts
return `DL-${String(store.deadlines.length + 501).padStart(3, "0")}`;
```

Após soft-delete, `length` não diminui. Após `resetStore()`, reinicia. IDs duplicados são garantidos em cenários de concorrência.

**Correção:** `crypto.randomUUID()` ou sequência do DB.

**Esforço:** Pequeno (~3h) · **Prazo:** Próxima sprint

---

## 🟠 ARQ-04 — `listDeadlines`/`getDeadline` sem filtro de soft-delete
`shared/agro/store.ts:188-195`

Diferente de todas as outras listas, `listDeadlines` e `getDeadline` retornam entidades soft-deletadas. `Deadline` tem `deletedAt` no tipo (`types.ts:172`) mas o filtro não é aplicado.

**Correção:** adicionar `.filter(d => !d.deletedAt)` em ambas as funções.

**Esforço:** Pequeno (~15min) · **Prazo:** Imediato

---

## 🟠 ARQ-05 — Copilot: `history` aceito mas ignorado; keyword matching ambíguo
`shared/agro/copilot.ts:93-156,228-523`

1. `CopilotQueryRequest.history` (types.ts:600) é aceito mas **completamente ignorado** — sem contexto de conversa
2. `matchPromptId` verifica keywords sequencialmente — "qual o risco de sucessão?" casa com `"risks-today"` antes de checar `"succession-meeting"`
3. `resolveCopilotQuery` é uma cadeia de 13 `if (promptId === ...)` com blocos quase idênticos (~300 linhas)

**Correção:**
- Tabela `Record<promptId, builderFn>` em vez de if-chain
- Sistema de scoring/peso para keywords
- Passar `history` como contexto ao LLM real

**Esforço:** Médio (~2 dias) · **Prazo:** Backlog

---

## 🟠 ARQ-06 — Falta de error boundaries por rota
`src/main.tsx`

Único `ErrorBoundary` global. Se uma página crasha, o app inteiro morre.

**Correção:** wraps por `AgroRoute` com `ErrorBoundary` específico e fallback de "voltar ao início".

**Esforço:** Pequeno (~2h) · **Prazo:** Próxima sprint

---

## 🟠 ARQ-07 — Zero testes para auth/RBAC (código mais crítico)
Áreas sem teste:

| Área | LOC | Testes | Risco |
|---|---|---|---|
| Auth/RBAC (`auth.ts`, `auth-server.ts`) | ~400 | 0 | 🔴 |
| Repository DB (`repository.ts`) | 2.424 | 0 | 🟠 |
| Handler API (`[resource].ts`) | 1.709 | 0 | 🟠 |
| Componentes React | ~5.000 | 0 | 🟡 |
| Hooks (`use-crm-queries.ts`) | 508 | 0 | 🟡 |
| Copilot (11 de 13 prompts) | ~400 | 2 testes | 🟡 |
| Filtros (matters, tasks, accounts) | ~200 | 0 | 🟡 |

**Correção:** priorizar testes de auth/RBAC (security-critical), depois repository e handler.

**Esforço:** Alto (~5 dias) · **Prazo:** Backlog contínuo

---

## 🟡 ARQ-08 — `data-service.ts` triplica trabalho por entidade
`api/_lib/data-service.ts` (1.187 linhas)

Cada entidade requer implementação em `store.ts` AND `repository.ts` + glue em `data-service.ts`. `DB_BACKED_RESOURCES` em `guard.ts` deve ser manualmente sincronizado.

**Correção:** codegen ou factory de data-service a partir dos tipos. Resource registry que mapeia entidade → { store, repo, guard }.

**Esforço:** Médio (~2-3 dias) · **Prazo:** Backlog

---

## 🟡 ARQ-09 — Paginação inconsistente
List endpoints retornam `PaginatedResult<T>`. Deadlines, activities, contacts, properties, opposing-parties retornam arrays sem paginação. Quebrará quando dados crescerem.

**Correção:** unificar todos os list endpoints para `PaginatedResult<T>`.

**Esforço:** Médio (~1-2 dias) · **Prazo:** Backlog

---

## 🟡 ARQ-10 — Sem observabilidade estruturada
Apenas `console.error`/`console.warn`. Sem log levels, sem JSON estruturado, sem correlation IDs, sem métricas (request count, latência, error rate), sem Sentry/Datadog, sem tracking de uso do Copilot (tokens, custo).

**Correção:** logger estruturado (pino), Sentry para erros, Vercel Analytics para métricas.

**Esforço:** Médio (~2 dias) · **Prazo:** Backlog

---

## 🟡 ARQ-11 — `schema.sql` e `migrate.sql` dessincronizados
`db/schema.sql` vs `db/migrate.sql`

`schema.sql` é DDL "limpa" mas `migrate.sql` é a migration real. Divergem:
- `schema.sql:60-77` (accounts) inclui `properties`, `contacts` como colunas nativas
- `migrate.sql:62-73` omite essas colunas, depois adiciona via ALTER (linhas 143-147)
- `leads` em `schema.sql` tem `phone`, `email`, `cnpj`, `cpf` — `migrate.sql` não

`schema.sql` é aspiracional mas não é source of truth.

**Correção:** gerar `schema.sql` a partir de `migrate.sql` ou usar ferramenta de migration (Drizzle, Prisma).

**Esforço:** Pequeno (~2h) · **Prazo:** Backlog

---

## 🔵 ARQ-12 — Sem API versioning
Rotas `/api/agro/*` sem prefixo de versão. Breaking changes exigirão deploy coordenado frontend/backend.

**Correção:** adicionar `/api/v1/agro/*` e manter compatibilidade com rota atual.

**Esforço:** Pequeno (~2h) · **Prazo:** Backlog

---

## 🔵 ARQ-13 — Multi-tenancy não preparado
Sem `organizationId` ou `tenantId` em nenhuma entidade. Schema, queries e RBAC não suportam isolamento organizacional.

**Correção:** planejar antes de escalar — adicionar `tenantId` em todas as tabelas e filtrar automaticamente.

**Esforço:** Alto (refatoração de schema) · **Prazo:** Backlog (antes de escalar)

---

## 🔵 ARQ-14 — `CopilotConfigStatus` e `history` — features incompletas
`shared/agro/types.ts:600,611-627`

- `CopilotQueryRequest.history` é definido mas ignorado
- `CopilotConfigStatus` retorna availability flags mas nunca é usada no frontend para feedback
- `CopilotResponse.simulated` é sempre `true` mesmo quando LLM real está configurado

**Correção:** integrar `history` no pipeline LLM; usar `CopilotConfigStatus` no UI; detectar `simulated` automaticamente.

**Esforço:** Médio · **Prazo:** Backlog

---

# ROADMAP PRIORIZADO

| # | Item | Frente | Sev | Esforço | Prazo |
|---|---|---|---|---|---|
| 1 | Persistir 8 entidades em DB (ou bloquear escrita) — QUAL-02 | Dados | 🔴 | Alto (3-5d) | Imediato |
| 2 | Corrigir cálculo de prazos (feriados + fuso + recesso) — ARQ-01 | Negócio | 🔴 | Médio (2-3d) | Imediato |
| 3 | Corrigir soft-delete em `listDeadlines`/`getDeadline` — ARQ-04 | Dados | 🟠 | Pequeno (15min) | Imediato |
| 4 | Escapar HTML em templates de email — SEC-02 | Segurança | 🔴 | Pequeno (1h) | Imediato |
| 5 | Corrigir fallback de token forjável — SEC-01 | Segurança | 🔴 | Pequeno (1h) | Hoje |
| 6 | Rate-limit no copilot, email, lookup — SEC-03 | Segurança | 🟠 | Pequeno (2h) | Esta semana |
| 7 | CSRF + allowlist no upload — SEC-04 | Segurança | 🟠 | Pequeno (2h) | Esta semana |
| 8 | Permissões dedicadas p/ recursos sensíveis — SEC-05 | Segurança | 🟠 | Médio (1-2d) | Esta semana |
| 9 | Consolidar funções de formatação — QUAL-05 | Qualidade | 🟠 | Pequeno (1h) | Esta semana |
| 10 | Datas timezone-safe em shared — ARQ-02 | Arquitetura | 🟠 | Médio (1d) | Próxima sprint |
| 11 | IDs via UUID — ARQ-03 | Arquitetura | 🟠 | Pequeno (3h) | Próxima sprint |
| 12 | Tipar API client (97 `any`) — QUAL-01 | Qualidade | 🔴 | Alto (3-4d) | Próxima sprint |
| 13 | Refatorar handler monolítico — QUAL-03 | Qualidade | 🟠 | Médio (2-3d) | Próxima sprint |
| 14 | Error boundaries por rota — ARQ-06 | Arquitetura | 🟠 | Pequeno (2h) | Próxima sprint |
| 15 | Falhar-fechado em segredos — SEC-07 | Segurança | 🟡 | Pequeno (1h) | Próxima sprint |
| 16 | Split `repository.ts` — QUAL-04 | Qualidade | 🟠 | Médio (2d) | Próxima sprint |
| 17 | Gate `local-handlers` em produção — QUAL-06 | Qualidade | 🟠 | Pequeno (1h) | Próxima sprint |
| 18 | Erro handling com logging real — QUAL-07 | Qualidade | 🟡 | Médio (1d) | Próxima sprint |
| 19 | Testes auth/RBAC — ARQ-07 | Qualidade | 🟠 | Médio (2d) | Backlog |
| 20 | `<ResourceListPage>` genérico — QUAL-08 | Qualidade | 🟡 | Médio (2d) | Backlog |
| 21 | Observabilidade estruturada — ARQ-10 | Arquitetura | 🟡 | Médio (2d) | Backlog |
| 22 | Copilot: tabela de prompts + history — ARQ-05 | Arquitetura | 🟠 | Médio (2d) | Backlog |
| 23 | Paginação unificada — ARQ-09 | Arquitetura | 🟡 | Médio (1-2d) | Backlog |
| 24 | Config centralizada com Zod — QUAL-12 | Qualidade | 🟡 | Pequeno (2h) | Backlog |
| 25 | CI security scan — SEC-12 | Segurança | 🔵 | Pequeno (1h) | Backlog |
| 26 | Testes: handler + repository + componentes — ARQ-07 | Qualidade | 🟡 | Alto (5d) | Backlog contínuo |

---

# SUGESTÕES DE EVOLUÇÃO DE PRODUTO

O projeto tem infraestrutura pronta para features de alto valor:

| # | Feature | Pré-requisito | Valor | Esforço |
|---|---|---|---|---|
| 1 | **Calendário de prazos com alertas** | Correção ARQ-01 + notificações | Diferencial central de CRM jurídico | Médio |
| 2 | **Editor de petições com RAG** | knowledge.ts + pgvector + entidades do caso | Acelera produção jurídica | Alto |
| 3 | **Portal do cliente** (read-only) | RBAC existente + nova role `cliente` | Transparência para clientes | Médio |
| 4 | **Importação CNJ/DataJud** | API externa + parser | Auto-popular cnjNumber/movimentações | Médio |
| 5 | **Streaming do Copilot** | `generateText` → `streamText` | UX responsiva para respostas longas | Pequeno |
| 6 | **Email compose/inbox no frontend** | Resend backend já existe | Comunicação integrada | Médio |
| 7 | **Upload de documentos no frontend** | R2 backend já existe | Gestão documental completa | Pequeno |
| 8 | **Optimistic updates** | React Query já configurado | UX imediata em mutations | Pequeno |
| 9 | **Dashboard financeiro** | Persistir invoices/time-entries (QUAL-02) | Visão gerencial de receita | Médio |
| 10 | **Multi-tenancy** | Schema refactor (ARQ-13) | Escalar para múltiplos escritórios | Alto |

---

## Metodologia

- **Agente Frontend:** varredura de `src/` (106 arquivos, ~14.400 LOC) — pages, hooks, components, contexts, lib, api client
- **Agente Backend:** varredura de `api/` (31 arquivos) — auth, db, llm, guards, rate-limit, validation, handlers
- **Agente Shared/Scripts:** varredura de `shared/` (19 arquivos), `scripts/` (2), `db/` (2), `e2e/` (1)
- **Leitura manual:** configs (package.json, tsconfig, vercel.json, vite.config, vitest.config, eslint, CI, .env.example, .gitignore)

Todos os achados foram confirmados por leitura direta dos arquivos citados com referências `arquivo:linha`. Nenhuma alteração de código foi feita nesta auditoria.
