import { createContext } from "react";
import type { AgroUser } from "@shared/agro/types";

export interface AuthContextValue {
  user: AgroUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  acceptToken: (token: string) => Promise<void>;
  logout: () => void;
  canAccess: (resource: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
