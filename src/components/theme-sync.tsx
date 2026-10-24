import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

function applyTheme(theme: "light" | "dark" | "system") {
  // System default color is white (light mode). Dark mode is active only when explicitly selected as "dark".
  const dark = theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeSync() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return null;
}

export function StoreHydration() {
  useEffect(() => {
    void useAppStore.persist.rehydrate();
    const t = window.setTimeout(() => {
      if (!useAppStore.getState().hydrated) useAppStore.getState().setHydrated(true);
    }, 800);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
