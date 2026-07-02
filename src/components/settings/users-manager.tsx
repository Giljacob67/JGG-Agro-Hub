import { useId, useState } from "react";
import { Loader2, UserPlus, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useSetUserPassword,
} from "@/hooks/use-crm-queries";
import { useAuth } from "@/contexts/use-auth";
import type { AgroRole, ManagedUser } from "@shared/agro/types";

const ROLE_OPTIONS: { value: AgroRole; label: string }[] = [
  { value: "gestao", label: "Gestão" },
  { value: "comercial", label: "Comercial" },
  { value: "juridico", label: "Jurídico" },
];

const ROLE_LABEL: Record<AgroRole, string> = {
  gestao: "Gestão",
  comercial: "Comercial",
  juridico: "Jurídico",
};

function errMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function UsersManager() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, isError } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const setPassword = useSetUserPassword();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AgroRole>("comercial");
  const [password, setPassword_] = useState("");

  const [pwTarget, setPwTarget] = useState<ManagedUser | null>(null);
  const [pwValue, setPwValue] = useState("");
  const pwTitleId = useId();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    if (password && password.length < 8) {
      toast.error("Senha deve ter ao menos 8 caracteres");
      return;
    }
    try {
      await createUser.mutateAsync({
        email: email.trim(),
        name: name.trim(),
        role,
        password: password || undefined,
      });
      toast.success("Usuário criado");
      setEmail("");
      setName("");
      setRole("comercial");
      setPassword_("");
    } catch (err) {
      toast.error(errMessage(err, "Erro ao criar usuário"));
    }
  }

  async function changeRole(u: ManagedUser, next: AgroRole) {
    if (next === u.role) return;
    try {
      await updateUser.mutateAsync({ id: u.id, patch: { role: next } });
      toast.success("Papel atualizado");
    } catch (err) {
      toast.error(errMessage(err, "Erro ao atualizar papel"));
    }
  }

  async function toggleActive(u: ManagedUser) {
    try {
      await updateUser.mutateAsync({ id: u.id, patch: { active: !u.active } });
      toast.success(u.active ? "Usuário desativado" : "Usuário ativado");
    } catch (err) {
      toast.error(errMessage(err, "Erro ao alterar status"));
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwTarget) return;
    if (pwValue.length < 8) {
      toast.error("Senha deve ter ao menos 8 caracteres");
      return;
    }
    try {
      await setPassword.mutateAsync({ id: pwTarget.id, password: pwValue });
      toast.success(`Senha definida para ${pwTarget.name}`);
      setPwTarget(null);
      setPwValue("");
    } catch (err) {
      toast.error(errMessage(err, "Erro ao definir senha"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Criar usuário */}
      <form onSubmit={handleCreate} className="surface-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Novo usuário</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@jgggroup.com.br"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Papel</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AgroRole)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Senha (opcional, mín. 8)
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword_(e.target.value)}
              placeholder="Definir senha de acesso"
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={createUser.isPending}>
          {createUser.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          Criar usuário
        </Button>
      </form>

      {/* Lista */}
      <div className="surface-panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Usuários e acessos</h3>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </p>
        ) : isError ? (
          <p className="text-sm text-accent">Não foi possível carregar os usuários.</p>
        ) : !users?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {u.name}
                      {isSelf && (
                        <span className="text-[10px] text-muted-foreground ml-1.5">(você)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {!u.active && <Badge variant="outline">Inativo</Badge>}
                    {!u.hasPassword && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Sem senha
                      </Badge>
                    )}

                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as AgroRole)}
                      disabled={updateUser.isPending}
                      aria-label={`Papel de ${u.name}`}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {ROLE_LABEL[o.value]}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPwTarget(u);
                        setPwValue("");
                      }}
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1" />
                      Senha
                    </Button>

                    <Button
                      type="button"
                      variant={u.active ? "ghost" : "default"}
                      size="sm"
                      disabled={updateUser.isPending}
                      onClick={() => toggleActive(u)}
                    >
                      {u.active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Definir senha */}
      {pwTarget && (
        <Dialog
          open
          onClose={() => setPwTarget(null)}
          labelledBy={pwTitleId}
          panelClassName="w-full max-w-sm mx-4"
        >
          <form
            onSubmit={submitPassword}
            className="surface-panel p-5 space-y-4 bg-background"
          >
            <div>
              <h3 id={pwTitleId} className="text-sm font-semibold">
                Definir senha
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pwTarget.name} · {pwTarget.email}
              </p>
            </div>
            <Input
              type="password"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              placeholder="Nova senha (mín. 8)"
              autoComplete="new-password"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPwTarget(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={setPassword.isPending}>
                {setPassword.isPending && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
