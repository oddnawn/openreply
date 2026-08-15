"use client";

/**
 * Theme picker.
 *
 * The choice is written to localStorage and applied as data-theme on <html>.
 * It is deliberately not stored per user in the database: a theme is a property
 * of the screen you are sitting at, not of the account, and a round trip to
 * Postgres to decide what colour the page is would show as a flash of the wrong
 * theme on every load.
 *
 * The inline script in app/layout.tsx applies the saved value before first
 * paint. Keep THEME_STORAGE_KEY in sync with it.
 */

import { useSyncExternalStore } from "react";

export const THEME_STORAGE_KEY = "oddnawn:theme";

export const THEMES = [
  { id: "blue", label: "Blue", swatch: "#0a60f7", ground: "#f2f5f9" },
  { id: "orange", label: "Orange", swatch: "#dc5b05", ground: "#faf6f2" },
  { id: "green", label: "Green", swatch: "#0f9d6e", ground: "#f2f8f5" },
  { id: "midnight", label: "Midnight", swatch: "#4bb7fa", ground: "#0b1020" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

/* The active theme's home is the DOM — the inline script in layout sets it
   before React exists, so React is a reader here, not the owner. That makes
   this a textbook useSyncExternalStore case: reading it in an effect and
   mirroring it into state would be a cascading render, and a lazy initialiser
   would break the server render. */
let listeners: Array<() => void> = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
  };
}

function getSnapshot(): ThemeId {
  const current = document.documentElement.dataset.theme as ThemeId | undefined;
  return current && THEMES.some((t) => t.id === current) ? current : "blue";
}

// The server has no idea which theme is stored, and guessing wrong would flash.
// Reporting the default is correct: it matches what the inline script leaves in
// place for a first-time visitor.
function getServerSnapshot(): ThemeId {
  return "blue";
}

/* Writing the theme belongs with the rest of the store, not in the component.
   The compiler is right to reject a component reaching out and mutating the
   document: the store owns that value, and the component only reads it. */
function setTheme(id: ThemeId) {
  const root = document.documentElement;

  // Transitions must be off across the swap — see .theme-switching in
  // globals.css. Without this, every button keeps its previous accent colour
  // while the rest of the page rethemes around it.
  root.classList.add("theme-switching");
  root.dataset.theme = id;
  // Force a synchronous style recalculation so the new colours are committed
  // while transitions are still suppressed.
  void root.offsetHeight;
  requestAnimationFrame(() => root.classList.remove("theme-switching"));

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Private browsing can refuse storage. The theme still applies for this
    // session; it just won't be remembered, which is better than throwing.
  }
  listeners.forEach((l) => l());
}

export default function ThemePicker() {
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {THEMES.map((theme) => {
        const selected = active === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => setTheme(theme.id)}
            aria-pressed={selected}
            className={`rounded-xl border p-3 text-left transition-colors ${
              selected
                ? "border-accent ring-1 ring-accent"
                : "border-border hover:border-border-hover"
            }`}
          >
            <span
              className="mb-2 flex h-12 items-end gap-1 rounded-lg p-2"
              style={{ background: theme.ground }}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: theme.swatch }}
              />
              <span
                className="h-3 flex-1 rounded-full"
                style={{ background: theme.swatch, opacity: 0.25 }}
              />
            </span>
            <span className="text-sm font-medium">{theme.label}</span>
          </button>
        );
      })}
    </div>
  );
}
