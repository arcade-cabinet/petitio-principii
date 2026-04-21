/**
 * i18n — i18next configuration for Petitio Principii.
 *
 * Supported locales: en (canon), es, fr, ar (RTL).
 *
 * Grammar-slot policy (documented in docs/i18n.md):
 *   - UI chrome strings (buttons, labels, errors, banners) → fully translated.
 *   - Surrealist game prose (room descriptions, agent narration, hint text,
 *     fragment corpus) → stays English. These are quotations of PD surrealist
 *     literature or RiTa-generated derivatives; their meaning is in the sound
 *     and rhythm, not lexical content. Translating them would break the voice.
 *   - Room template *structure* localizes; fragment *content* doesn't.
 *
 * Language detection: honours `?lng=` URL param, then `localStorage`, then
 * browser preference, then falls back to `en`.
 *
 * Bundle strategy (QA item #3):
 *   - `en` is statically imported as the always-loaded fallback.
 *   - `es`, `fr`, `ar` are loaded on demand via `i18next-resources-to-backend`
 *     so the main chunk doesn't carry ~25 kB of locales the player won't read.
 *   - Vite code-splits each `./locales/*.json` import into its own chunk.
 */
import i18next from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";

// `en` stays in the main chunk as the fallback. Everything else is dynamic.
import en from "./locales/en.json";

export const SUPPORTED_LANGUAGES = ["en", "es", "fr", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "pp.lang";

function detectLanguage(): string {
  // 1. URL param
  try {
    const param = new URLSearchParams(window.location.search).get("lng");
    if (param && SUPPORTED_LANGUAGES.includes(param as SupportedLanguage)) return param;
  } catch {
    /* SSR / test context */
  }

  // 2. localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) return stored;
  } catch {
    /* ignore */
  }

  // 3. Browser language (first two chars)
  if (typeof navigator !== "undefined") {
    const lang = navigator.language?.slice(0, 2).toLowerCase();
    if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) return lang;
  }

  return "en";
}

// RTL languages that need dir="rtl" on <html>.
const RTL_LANGS = new Set(["ar"]);

/** Apply dir attribute to <html> whenever language changes. */
function applyDir(lang: string) {
  document.documentElement.setAttribute("dir", RTL_LANGS.has(lang) ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lang);
}

// Dynamic backend: only the active (non-en) locale is fetched; Vite splits
// each JSON import into its own chunk.
const backend = resourcesToBackend((language: string, _ns: string) => {
  // `en` is already bundled — short-circuit to avoid a needless network request.
  if (language === "en") return Promise.resolve(en);
  switch (language) {
    case "es":
      return import("./locales/es.json").then((m) => m.default);
    case "fr":
      return import("./locales/fr.json").then((m) => m.default);
    case "ar":
      return import("./locales/ar.json").then((m) => m.default);
    default:
      return Promise.resolve(en);
  }
});

i18next
  .use(backend)
  .use(initReactI18next)
  .init({
    lng: detectLanguage(),
    fallbackLng: "en",
    // Seed `en` so the first render never waits on the backend.
    resources: {
      en: { translation: en },
    },
    partialBundledLanguages: true,
    interpolation: {
      // React already escapes values.
      escapeValue: false,
    },
  });

// Apply dir on init and on every language change.
applyDir(i18next.language);
i18next.on("languageChanged", applyDir);

export function setLanguage(lang: SupportedLanguage): void {
  i18next.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export { i18next };
