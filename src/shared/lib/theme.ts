export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

export const THEME_STORAGE_KEY = "soc.theme";

/**
 * Runs inline in <head> before first paint (app/layout.tsx): applies the stored choice, or the
 * system preference when there is none, and keeps following the system while no choice is stored.
 * Kept as a plain string: it executes before any bundle loads.
 */
export const themeBootScript = `(function(){var K="${THEME_STORAGE_KEY}",d=document.documentElement;function stored(){try{var t=localStorage.getItem(K);return t==="light"||t==="dark"?t:null}catch(e){return null}}var m=null;try{m=window.matchMedia("(prefers-color-scheme: dark)")}catch(e){}function sys(){return m&&m.matches?"dark":"light"}d.dataset.theme=stored()||sys();if(m&&m.addEventListener)m.addEventListener("change",function(){if(!stored())d.dataset.theme=sys()})})();`;

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // ponytail: private mode / blocked storage — the choice still applies for this page load.
  }
  document.documentElement.dataset.theme =
    preference === "system" ? systemTheme() : preference;
}

/** Direct light/dark switch (identity screens); stores an explicit choice. */
export function applyTheme(theme: Theme) {
  applyThemePreference(theme);
}

export function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  window.addEventListener("storage", onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onChange);
  };
}
