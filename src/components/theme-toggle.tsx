"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("near-theme", next ? "dark" : "light");
    } catch {
      // almacenamiento no disponible
    }
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Modo claro" : "Modo noche"}
      className="rounded-lg p-2 text-ink-soft transition hover:bg-sand hover:text-ink"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
