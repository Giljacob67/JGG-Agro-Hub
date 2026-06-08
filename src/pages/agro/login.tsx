import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { usePageTitle } from "@/hooks/use-page-title";
import { ROUTES } from "@/lib/routes";
import { JGG_AGRO_HUB_NAME, JGG_GROUP_NAME } from "@/lib/brand";

export default function AgroLoginPage() {
  usePageTitle("Acesso");
  const { user, login } = useAuth();
  const [location] = useLocation();
  const [email, setEmail] = useState("agro@jgggroup.com.br");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const from = params.get("from") || ROUTES.commandCenter;

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
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
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="text-[11px] text-muted-foreground mt-6 leading-relaxed">
          Ambiente de desenvolvimento: senha padrão{" "}
          <code className="text-foreground">jgg-agro-dev</code>. Perfis: gestão,
          comercial e jurídico.
        </p>
      </Card>
    </div>
  );
}