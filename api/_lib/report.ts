/**
 * Reporter de erros server-side. Sempre loga estruturado no servidor. Quando
 * `SENTRY_DSN` está definido E o SDK `@sentry/node` está instalado, encaminha
 * o erro; caso contrário é no-op silencioso (a wiring fica pronta, ativa só
 * com a dependência + DSN provisionados).
 *
 * Mantido sem dependência obrigatória de propósito: importar `@sentry/node`
 * é dinâmico e tolerante a falha, então o build/runtime não quebra sem ele.
 */

let sentryInit: Promise<unknown> | null = null;

async function getSentry(): Promise<{
  captureException: (e: unknown, hint?: unknown) => void;
} | null> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return null;
  if (!sentryInit) {
    sentryInit = (async () => {
      try {
        // Import dinâmico: ausência do pacote não derruba o runtime.
        const mod = (await import(
          /* @vite-ignore */ "@sentry/node" as string
        ).catch(() => null)) as {
          init?: (opts: Record<string, unknown>) => void;
          captureException?: (e: unknown, hint?: unknown) => void;
        } | null;
        if (!mod?.init || !mod.captureException) return null;
        mod.init({
          dsn,
          environment: process.env.VERCEL_ENV ?? "development",
          tracesSampleRate: 0,
        });
        return mod;
      } catch {
        return null;
      }
    })();
  }
  const resolved = (await sentryInit) as {
    captureException?: (e: unknown, hint?: unknown) => void;
  } | null;
  return resolved?.captureException
    ? { captureException: resolved.captureException }
    : null;
}

/**
 * Captura um erro: log estruturado sempre; encaminha ao Sentry se disponível.
 */
export async function captureServerError(
  err: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  const detail = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error("[capture]", JSON.stringify(context), detail);
  try {
    const sentry = await getSentry();
    sentry?.captureException(err, { extra: context });
  } catch {
    // nunca deixar o reporter derrubar o request
  }
}
