import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AgroUser } from "@shared/agro/types";
import { roleCanAccess } from "@shared/agro/auth";
import { agroApi, getAuthToken, setAuthToken } from "@/lib/api/client";
import { AuthContext } from "./auth-context-value";

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
