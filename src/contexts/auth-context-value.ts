import { createContext } from "react";
import type { AgroUser } from "@shared/agro/types";

export interface AuthContextValue {
  user: AgroUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** @deprecated token é gerenciado pelo backend via cookie HttpOnly. */
  acceptToken: (token: string) => Promise<void>;
  logout: () => void;
  canAccess: (resource: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
