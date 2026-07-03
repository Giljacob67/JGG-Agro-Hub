import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { usePageTitle } from "@/hooks/use-page-title";
import { ROUTES } from "@/lib/routes";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { JGG_AGRO_HUB_NAME, JGG_GROUP_NAME } from "@/lib/brand";

export default function AgroLoginPage() {
  usePageTitle("Acesso");
  const { user, login } = useAuth();
  const [location] = useLocation();
  const ssoEnabled = import.meta.env.VITE_SSO_ENABLED === "true";
  const isDev = import.meta.env.DEV;
  const [email, setEmail] = useState(isDev ? "agro@jgggroup.com.br" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const from = params.get("from") || ROUTES.commandCenter;

  // A restauração de sessão é feita uma única vez pelo AuthProvider no
  // carregamento da app (e em todo full-reload, inclusive no retorno do SSO,
  // que redireciona via window.location). Reconfirmar a sessão aqui, a cada
  // mount da tela de login, reautenticava logo após o logout — a sessão
  // "ressuscitava" e a tela de login nunca aparecia. Por isso NÃO chamamos
  // me() aqui: se há sessão válida, `user` já vem do contexto.
  if (user) return <Redirect to={from} />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError("Credenciais inválidas. Verifique e-mail e senha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle variant="compact" />
      </div>
      <Card className="w-full max-w-md p-6 md:p-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
            {JGG_GROUP_NAME}
          </p>
          <h1 className="text-xl font-bold mt-1">{JGG_AGRO_HUB_NAME}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Acesso interno — equipe Agro JGG Group.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        {ssoEnabled && (
          <Button
            type="button"
            variant="outline"
            className="w-full mt-3"
            onClick={() => {
              const target = `/api/auth/sso?from=${encodeURIComponent(from)}`;
              window.location.href = target;
            }}
          >
            Entrar com SSO corporativo
          </Button>
        )}

        {isDev && (
          <p className="text-[11px] text-muted-foreground mt-6 leading-relaxed">
            Ambiente de desenvolvimento: senha padrão{" "}
            <code className="text-foreground">jgg-agro-dev</code>. Perfis: gestão,
            comercial e jurídico.
          </p>
        )}
      </Card>
    </div>
  );
}
