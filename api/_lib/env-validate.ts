/**
 * Validação de ambiente em cold start. Em produção (VERCEL_ENV) exige que os
 * segredos críticos existam e tenham entropia mínima (≥32 chars). Falha-fechado:
 * lança erro agregado, capturado pelo try/catch do handler → 500 genérico, em
 * vez de operar com segredo fraco/ausente. Resultado é memoizado por instância.
 */

const MIN_SECRET_LEN = 32;

let cached: { ok: true } | { ok: false; message: string } | null = null;

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

function check(): { ok: true } | { ok: false; message: string } {
  if (!isProduction()) return { ok: true };

  const errors: string[] = [];

  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) {
    errors.push("AUTH_SECRET ausente");
  } else if (authSecret.length < MIN_SECRET_LEN) {
    errors.push(`AUTH_SECRET muito curto (mínimo ${MIN_SECRET_LEN} caracteres)`);
  }

  // CSRF_SECRET é opcional (cai para AUTH_SECRET), mas se definido precisa ter entropia.
  const csrfSecret = process.env.CSRF_SECRET?.trim();
  if (csrfSecret && csrfSecret.length < MIN_SECRET_LEN) {
    errors.push(`CSRF_SECRET muito curto (mínimo ${MIN_SECRET_LEN} caracteres)`);
  }

  // Rate limit distribuído (Upstash/KV). O fallback em memória vive por
  // instância serverless, então não limita de fato sob escala. Enquanto o
  // provedor não está provisionado, apenas avisa. Defina
  // REQUIRE_DISTRIBUTED_RATELIMIT=true após provisionar para falhar-fechado.
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  const redisMissing = !redisUrl || !redisToken;
  if (redisMissing) {
    const msg =
      "Upstash/KV ausente (UPSTASH_REDIS_REST_URL/TOKEN ou KV_REST_API_URL/TOKEN) — rate limit caindo para memória por instância";
    if (process.env.REQUIRE_DISTRIBUTED_RATELIMIT === "true") {
      errors.push(`${msg}; REQUIRE_DISTRIBUTED_RATELIMIT exige provisionamento`);
    } else {
      console.warn(`[env-validate] AVISO: ${msg}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, message: `Configuração de ambiente inválida: ${errors.join("; ")}` };
  }
  return { ok: true };
}

/**
 * Garante ambiente válido. Lança em produção mal-configurada. Idempotente
 * (memoizado), seguro para chamar no topo de cada handler.
 */
export function assertValidEnv(): void {
  if (cached === null) {
    cached = check();
    if (!cached.ok) {
      console.error(`[env-validate] ${cached.message}`);
    }
  }
  if (!cached.ok) {
    throw new Error(cached.message);
  }
}

/** Reseta a memoização. Uso restrito a testes. */
export function __resetEnvValidationCacheForTest(): void {
  cached = null;
}
