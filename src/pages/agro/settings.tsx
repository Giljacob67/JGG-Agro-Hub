import { Settings, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { UsersManager } from "@/components/settings/users-manager";
import { CopilotSettings } from "@/components/copilot/copilot-settings";
import { useAuth } from "@/contexts/use-auth";
import { usePageTitle } from "@/hooks/use-page-title";

export default function SettingsPage() {
  usePageTitle("Configurações");
  const { user } = useAuth();
  const isGestao = user?.role === "gestao";

  return (
    <AppShell>
      <div className="max-w-[80rem] mx-auto space-y-8">
        <header className="command-hero p-6 md:p-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl border border-primary/20 bg-primary/8 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div className="max-w-3xl">
              <p className="text-label-caps text-primary/80">Administração</p>
              <h1 className="text-2xl font-semibold tracking-tight mt-1">
                Configurações
              </h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Gestão de usuários e acessos do sistema e configuração do modelo de IA
                usado pelo Agro Copilot.
              </p>
            </div>
          </div>
        </header>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              Usuários e acessos
            </h2>
          </div>
          <UsersManager />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              Modelo de IA (Agro Copilot)
            </h2>
          </div>
          <CopilotSettings canEdit={isGestao} />
        </section>
      </div>
    </AppShell>
  );
}
