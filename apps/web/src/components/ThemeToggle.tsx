"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("acs-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = stored ? stored === "dark" : prefersDark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }, []);

  function toggle(): void {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("acs-theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      className="no-print rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light appearance" : "Switch to dark appearance"}
    >
      {dark ? "Light appearance" : "Dark appearance"}
    </button>
  );
}
