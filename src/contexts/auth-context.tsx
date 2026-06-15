import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AgroUser } from "@shared/agro/types";
import { roleCanAccess } from "@shared/agro/auth";
import { agroApi, clearLegacyAuthToken } from "@/lib/api/client";
import { AuthContext } from "./auth-context-value";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AgroUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const me = await agroApi.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          clearLegacyAuthToken();
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
    const { user: loggedUser } = await agroApi.login(email, password);
    setUser(loggedUser);
  }, []);

  const logout = useCallback(() => {
    void agroApi.logout().catch(() => undefined);
    clearLegacyAuthToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      acceptToken: async () => {
        // SSO já configura cookie HttpOnly no callback; só confirmamos sessão.
        const me = await agroApi.me();
        setUser(me);
      },
      logout,
      canAccess: (resource: string) =>
        user ? roleCanAccess(user.role, resource) : false,
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
