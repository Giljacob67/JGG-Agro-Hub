import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  storeTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";
import { ThemeContext } from "./theme-context-value";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : getStoredTheme(),
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    typeof window === "undefined" ? "light" : getSystemTheme(),
  );

  const resolved = useMemo<ResolvedTheme>(
    () => (preference === "system" ? systemTheme : preference),
    [preference, systemTheme],
  );

  const setPreference = useCallback((next: ThemePreference) => {
    storeTheme(next);
    setPreferenceState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPreference]);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(getSystemTheme());

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference, toggleTheme }),
    [preference, resolved, setPreference, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
