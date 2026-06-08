import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AgroRole, AgroUser } from "@shared/agro/types";
import { agroApi, getAuthToken, setAuthToken } from "@/lib/api/client";

interface AuthContextValue {
  user: AgroUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  acceptToken: (token: string) => Promise<void>;
  logout: () => void;
  canAccess: (resource: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function roleCanAccess(role: AgroRole, resource: string): boolean {
  if (role === "gestao") return true;
  if (role === "comercial") {
    return ["leads", "accounts", "opportunities", "stats", "crm"].includes(
      resource,
    );
  }
  if (role === "juridico") {
    return ["matters", "tasks", "stats", "crm"].includes(resource);
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AgroUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getAuthToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await agroApi.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          setAuthToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedUser } = await agroApi.login(email, password);
    setAuthToken(token);
    setUser(loggedUser);
  }, []);

  const acceptToken = useCallback(async (token: string) => {
    setAuthToken(token);
    const me = await agroApi.me();
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      acceptToken,
      logout,
      canAccess: (resource: string) =>
        user ? roleCanAccess(user.role, resource) : false,
    }),
    [user, loading, login, acceptToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}