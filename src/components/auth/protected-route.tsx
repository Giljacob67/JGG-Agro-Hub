import type { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { ROUTES } from "@/lib/routes";

interface ProtectedRouteProps {
  children: ReactNode;
  resource?: string;
}

export function ProtectedRoute({ children, resource }: ProtectedRouteProps) {
  const { user, loading, canAccess } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando sessão…
      </div>
    );
  }

  if (!user) {
    return <Redirect to={`${ROUTES.login}?from=${encodeURIComponent(location)}`} />;
  }

  if (resource && !canAccess(resource)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <p className="text-lg font-semibold">Acesso restrito</p>
          <p className="text-sm text-muted-foreground">
            Seu perfil ({user.role}) não tem permissão para esta área.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}