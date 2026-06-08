# JGG Agro Hub

CRM operacional do JGG Group — prospecção, carteira de clientes, pipeline comercial e demandas jurídicas do segmento Agro.

## Desenvolvimento

```bash
npm install
npm run dev
```

Aplicação em `http://localhost:5173`. Rotas canônicas sob `/agro/*`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção |
| `npm run typecheck` | Verificação TypeScript |
| `npm run lint` | ESLint (`src`, `shared`) |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes E2E (Playwright) |

## Autenticação

### Desenvolvimento local

- Credenciais: `agro@jgggroup.com.br` / `jgg-agro-dev`
- Browser dev (`VITE_USE_API` ausente): `shared/agro/auth.ts` — token legado para DX
- API Vercel: `api/_lib/auth-server.ts` — senha com scrypt + token HMAC-SHA256

### Produção (obrigatório)

Defina `AUTH_SECRET` (mín. 32 caracteres) nas variáveis de ambiente da Vercel.

Sem `AUTH_SECRET`, a API ainda emite tokens com chave insegura — **não use em produção**.

### SSO corporativo (OIDC / Azure AD)

Variáveis:

| Variável | Descrição |
|----------|-----------|
| `SSO_ENABLED` | `true` na Vercel |
| `VITE_SSO_ENABLED` | `true` no build do frontend |
| `SSO_ISSUER` | URL do tenant OIDC |
| `SSO_CLIENT_ID` | Client ID |
| `SSO_CLIENT_SECRET` | Client secret |
| `SSO_REDIRECT_URI` | Ex.: `https://seu-app.vercel.app/api/auth/callback` |
| `APP_URL` | URL base do app |

Rotas: `GET /api/auth/sso` (redirect) e `GET /api/auth/callback` (troca code por sessão).

O usuário SSO deve existir na lista interna (`auth-server.ts`) com o mesmo e-mail.

## Dados

Todo o seed em `shared/agro/seed.ts` é **100% fictício**. Nunca inserir clientes, propriedades ou contatos reais no repositório ou no ambiente de demonstração.

## Banco de dados (PostgreSQL / Neon)

Com `DATABASE_URL` configurada, a API usa PostgreSQL em vez do store em memória.

```bash
npm run db:setup        # migra + seed se vazio
npm run db:reseed       # força re-seed (--force)
```

Re-seed remoto (produção): `POST /api/admin/db-setup` com header `x-setup-secret` e `?force=1`.

Migrações idempotentes em `db/migrate.sql` e `api/_lib/db/migrate.ts` incluem:

- Colunas enriquecidas (leads, contas, oportunidades, demandas)
- Novos estágios do pipeline (`proposta_elaboracao`, `proposta_enviada`)
- Normalização automática do stage legado `proposta` → `proposta_elaboracao`

Campos opcionais em arrays (propriedades, contatos, documentos pendentes) são persistidos como `JSONB`.

## Arquitetura

- **Frontend:** React 19, Vite, wouter, TanStack Query, Tailwind
- **API:** Vercel serverless (`api/`) com store em memória ou PostgreSQL (Neon)
- **Domínio compartilhado:** `shared/agro/` (tipos, seed, stats, store)
- **Redirect legado:** `/command-center` → `/agro/command-center`