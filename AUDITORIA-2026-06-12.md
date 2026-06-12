# Auditoria técnica — JGG Agro Hub (12/06/2026)

Escopo: código completo (api/, shared/, src/, db/, scripts/, e2e/), configuração, conteúdo institucional e base de conhecimento. Verificação executada: `typecheck` limpo, `lint` com 3 warnings, 11/11 testes unitários passando.

---

## 1. CRÍTICO

### 1.1 Bypass de autenticação em produção
`api/_lib/auth-server.ts`, função `resolveSession`:

```ts
export function resolveSession(token: string | undefined): AgroUser | null {
  if (!token) return null;
  const secret = getAuthSecret();
  if (secret) {
    const user = verifySignedToken(token, secret);
    if (user) return user;
  }
  const devUser = verifySignedToken(token, "dev-insecure");  // ← sempre executado
  if (devUser) return devUser;
  return resolveDevSession(token);                            // ← token base64 SEM assinatura
}
```

Mesmo com `AUTH_SECRET` configurado, a API aceita: (a) tokens assinados com a chave pública `"dev-insecure"`; (b) tokens legados que são apenas `btoa(JSON.stringify({...}))` — forjáveis em uma linha de console com `role: "gestao"`. O README afirma que produção fica segura com `AUTH_SECRET`; isso é falso no código atual. **Correção:** quando `secret` existe, retornar `null` após a primeira verificação falhar. O fallback dev deve existir apenas quando `AUTH_SECRET` está ausente (e, idealmente, a API deve recusar operar sem secret quando `VERCEL_ENV === "production"`).

### 1.2 Senha única e pública para todos os usuários
`auth-server.ts`: os 3 usuários compartilham `DEV_PASSWORD_HASH` (hash de `jgg-agro-dev`, senha documentada no README público do repositório). Em produção, qualquer pessoa com o link loga como gestão. **Correção:** hashes individuais via env vars ou tabela `agro.users` no Postgres, com salt aleatório por usuário (o salt atual `agro-jgg-salt-v1` é fixo e hardcoded).

---

## 2. ALTO

### 2.1 SSO: open redirect com vazamento de token
`api/auth/sso.ts` aceita `?from=` arbitrário e o embute no `state`. `api/auth/callback.ts` faz:

```ts
const redirect = new URL(from, process.env.APP_URL ?? "...");
redirect.searchParams.set("token", result.token);
```

`new URL("https://evil.com", base)` resolve para `evil.com` — um link de phishing `/api/auth/sso?from=https://evil.com` entrega o token de sessão a domínio externo. **Correção:** validar que `from` começa com `/` e não com `//`.

### 2.2 Token de sessão em query string
O callback devolve o token como `?token=...` — vaza em histórico do browser, logs da Vercel e header Referer. Preferir cookie `HttpOnly; Secure; SameSite=Lax` ou, no mínimo, fragment (`#token=`).

### 2.3 SSO sem CSRF/nonce/PKCE e endpoints incorretos
O `state` não é assinado nem validado contra a sessão (CSRF no fluxo OAuth). Não há PKCE. Os endpoints são hardcoded no padrão Azure (`{issuer}/oauth2/v2.0/...`), mas para Azure AD o userinfo correto é `https://graph.microsoft.com/oidc/userinfo` — como está, o fluxo provavelmente falha na prática, e não é "OIDC genérico" como o README sugere. **Correção:** usar discovery (`/.well-known/openid-configuration`) e validar o `id_token` em vez de chamar userinfo.

### 2.4 PATCH sem validação de payload
`api/agro/leads.ts` (e handlers análogos): `updateLead(id, req.body ?? {})` aceita qualquer string em `status`, corrompendo dados dos quais filtros, stats e pipeline dependem. POST também não valida `status`/`priority` contra os enums. **Correção:** validação de enums no servidor (whitelist simples ou zod).

---

## 3. MÉDIO

- **`api/admin/db-setup.ts`:** comparação `header !== secret` não é timing-safe; usar `timingSafeEqual`. Menor, mas é o endpoint que dropa/recria o banco.
- **`dbCreateLead` (repository.ts):** ID gerado por `COUNT(*)+1` — colide após exclusões ou sob concorrência. Usar sequence do Postgres ou sufixo aleatório.
- **"Filtros server-side" são in-memory:** todos os `dbList*` fazem `SELECT *` da tabela inteira e filtram/paginam em JS. Para o porte atual funciona; o custo é crescente e o commit c5dc1d6 anuncia o que não existe. Registrar como dívida técnica ou implementar `WHERE` real.
- **Store em memória na Vercel:** sem `DATABASE_URL`, escritas (criar lead) vivem por instância serverless — comportamento errático silencioso. Logar warning ou recusar escrita em produção sem banco.
- **Token em `localStorage`** (`src/lib/api/client.ts`): qualquer XSS rouba a sessão. Aceitável para ferramenta interna; migrar para cookie HttpOnly quando o SSO entrar.
- **`roleCanAccess` duplicado** em `shared/agro/auth.ts` e `src/contexts/auth-context.tsx` (cópia literal). Drift de permissões é questão de tempo — importar do shared.
- **`pageSize` sem teto no servidor:** o cliente manda 100 por padrão e o servidor aceita qualquer valor. Capar (ex.: 200).
- **Sem rate limiting no login** e sem headers de segurança (CSP, X-Frame-Options) no `vercel.json`.

---

## 4. BAIXO / qualidade

- Lint: 3 warnings `react-refresh/only-export-components` (button.tsx, auth-context.tsx, theme-context.tsx) — extrair helpers para arquivos próprios.
- `formatDate`/`isOverdue` usam o hack `"T12:00:00"` para timezone — funciona, mas documentar ou usar date-fns quando o app crescer.
- Sem CI: não há GitHub Actions. Com typecheck+lint+test já verdes, um workflow de 15 linhas garante isso a cada push.
- E2E smoke é bom, mas cobre só leads — falta fluxo de matter/opportunity e um teste de RBAC (comercial não vê matters).

---

## 5. Conteúdo — landing institucional e base de conhecimento

**Pontos fortes:** texto sóbrio, compatível com o Provimento 205/2021 da OAB (sem promessa de resultado, sem mercantilização), pipeline de 9 fases consistente entre types, labels, README e migração (normalização `proposta → proposta_elaboracao` correta), seed 100% fictício com datas coerentes, disclaimers do Copilot honestos ("Resposta simulada — validar com responsável jurídico").

**Lacuna estratégica relevante:** as `SERVICE_AREAS` da landing não refletem o core real do contencioso do escritório. Há "Crédito rural, garantias e renegociação", mas **falta defesa em execuções de títulos do agro (CCB, CPR, cédulas rurais), impenhorabilidade da pequena propriedade e recuperação judicial do produtor rural** — exatamente onde o JGG tem diferencial. Mesma lacuna na base de conhecimento: a categoria "Contencioso rural" cobre posse/reintegração, mas não existe categoria de **contencioso bancário-rural** (embargos à execução, EPE, revisional de CCB com AF). Sugestão: adicionar 1 área na landing e 1 categoria KB com 3–4 documentos (checklist de defesa em execução de CCB, roteiro de impenhorabilidade pós-REsp 2.233.886, fluxo de RJ do produtor).

**Copilot:** o motor por keywords é uma maquete honesta. O próximo salto de valor é real: RAG sobre `KNOWLEDGE_DOCUMENTS` + Claude API no endpoint `POST /api/agro/copilot/query` (a estrutura já está pronta para isso — o comentário no handler aponta o caminho certo).

---

## 6. Priorização sugerida

1. **Hoje:** corrigir `resolveSession` (item 1.1) — 5 linhas — e trocar a senha compartilhada (1.2).
2. **Esta semana:** validar `from` no SSO (2.1), validação de enums nos PATCH/POST (2.4), CI no GitHub Actions.
3. **Antes de dados reais:** migrar usuários para o banco, cookie HttpOnly, rate limiting no login, cap de pageSize.
4. **Roadmap:** SSO via discovery OIDC + PKCE, filtros SQL reais, Copilot com RAG/Claude, conteúdo de contencioso bancário-rural na landing e KB.

**Avaliação geral:** projeto bem acima da média para v0.1 — arquitetura limpa (domínio compartilhado, dual store memória/Postgres, migrações idempotentes), tipos canônicos sem drift, testes verdes, README honesto. Os problemas graves estão concentrados em um único arquivo (`auth-server.ts`) e no fluxo SSO, ambos corrigíveis em horas.
