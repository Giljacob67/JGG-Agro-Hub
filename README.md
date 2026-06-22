# JGG Agro Hub

CRM Jurídico Agrícola — plataforma completa para escritório de advocacia rural.

## Acesso

**URL**: https://jgg-agro-hub.vercel.app

O acesso é por **SSO OIDC** (recomendado) ou por **senha individual** configurada
via variáveis de ambiente (hashes scrypt, nunca em texto plano). Em produção
com `AUTH_SECRET` ativo e sem hashes configurados, o login por senha fica
desabilitado — resta o SSO.

| Usuário | Email | Perfil |
|---------|-------|--------|
| Gestão | agro@jgggroup.com.br | gestao |
| Comercial | comercial@jgggroup.com.br | comercial |
| Jurídico | juridico@jgggroup.com.br | juridico |

Para habilitar login por senha, gere um hash por usuário e defina as env vars
`AUTH_PASSWORD_HASH_GESTAO/COMERCIAL/JURIDICO` (+ `AUTH_PASSWORD_SALT` aleatório):

```bash
npx tsx scripts/hash-password.ts "<senha forte e única por usuário>"
```

**Não committar senhas.** Girar as credenciais se qualquer senha foi exposta
em versões anteriores deste documento.

## Funcionalidades

### CRM Agro
- **Leads**: cadastro, qualificação, conversão para oportunidade
- **Contas**: gestão de clientes e propriedades rurais
- **Oportunidades**: pipeline comercial com estágios
- **Demandas Jurídicas**: processo completo com prazos, fases, riscos
- **Tarefas**: vinculação a demandas e contas

### Gestão Jurídica
- **Calculadora de Prazos**: 15 dias úteis (contestação, apelação, etc.)
- **Calendário de Audiências**: visualização mensal
- **Documentos**: upload para Cloudflare R2, versionamento, checklist
- **Horas/Faturamento**: timesheet, contratos de honorários
- **Conflito de Interesses**: verificação automática

### Gestão Agrícola
- **Safra Agrícola**: plantio, colheita, regiões
- **ITR/ITBI/IPVA**: rastreamento de obrigações tributárias
- **Licenças Ambientais**: LP, LI, LO com status e validade
- **Crédito Rural**: CPR, CCB, penhor, alienação fiduciária

### IA & Analytics
- **Agro Copilot**: assistente jurídico com RAG
- **Relatórios Financeiros**: receita, horas, demandas
- **Produtividade por Advogado**: ranking e métricas
- **Auditoria**: log completo de ações

## Arquitetura

```
Frontend: React 19 + Vite + TailwindCSS + TanStack Query
Backend:  Vercel Serverless Functions (4 rotas consolidadas)
Database: Neon PostgreSQL (memory fallback)
AI:       Vercel AI SDK v6 (OpenAI, Anthropic, Google, Ollama)
Storage:  Cloudflare R2 (presigned URLs)
Email:    Resend API
Auth:     scrypt + HMAC-SHA256 tokens
```

## Variáveis de Ambiente

```bash
# Autenticação (obrigatório)
AUTH_SECRET=sua_chave_secreta

# Banco de dados (opcional — usa memória sem DATABASE_URL)
DATABASE_URL=postgresql://...

# LLM (opcional — fallback para keyword engine)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Email (opcional)
RESEND_API_KEY=re_...

# Storage (opcional — uploads sem R2 ficam metadata-only)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=jgg-agro-docs
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Rate Limiting (opcional — usa memória sem Upstash)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## Deploy

```bash
# Instalar dependências
npm install

# Build
npm run build

# Deploy no Vercel
vercel --prod
```

## Desenvolvimento

```bash
# Servidor de desenvolvimento
npm run dev

# Typecheck
npm run typecheck

# Testes
npm run test

# Lint
npm run lint
```

## Estrutura de Pastas

```
api/
  _lib/          # Auth, audit, CORS, rate-limit, R2, email
  agro/          # CRUD consolidado (4 rotas)
  auth/          # Login/logout
  upload.ts      # Presigned URLs para R2
src/
  components/    # UI components (crm, layout, ui)
  pages/         # Páginas (agro, crm, command-center)
  hooks/         # React Query hooks
  lib/           # API client, rotas, navegação
shared/
  agro/          # Types, store, RBAC, copilot, seed data
```

## Licença

Propriedade JGG Group — Uso interno.
