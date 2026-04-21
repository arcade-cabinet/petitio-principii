import { useEffect, useState } from "react";

/**
 * useViewport — pure media-query subscription for layout decisions.
 *
 * The terminal's PAST drawer collapses on portrait (≤ 640px) and stays
 * expanded on landscape / desktop (≥ 641px). Per docs/UX.md §1.1 + §3.
 *
 * The breakpoint mirrors Tailwind's default `sm:` (640px) so layout
 * decisions stay in sync with the rest of the design system.
 */

export type ViewportClass = "portrait" | "landscape";

const PORTRAIT_QUERY = "(max-width: 640px)";

function classify(): ViewportClass {
  if (typeof window === "undefined") return "landscape"; // SSR-safe default
  return window.matchMedia(PORTRAIT_QUERY).matches ? "portrait" : "landscape";
}

export function useViewport(): ViewportClass {
  const [vc, setVc] = useState<ViewportClass>(classify);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(PORTRAIT_QUERY);
    const handler = (e: MediaQueryListEvent) => {
      setVc(e.matches ? "portrait" : "landscape");
    };
    // Subscribe via the modern API; fallback for ancient browsers omitted —
    // the project targets ESNext-capable runtimes only (Capacitor WebView,
    // current Chromium, Pages-served modern browsers).
    mql.addEventListener("change", handler);
    // Re-classify on mount in case the SSR/client guess differed.
    setVc(mql.matches ? "portrait" : "landscape");
    return () => mql.removeEventListener("change", handler);
  }, []);

  return vc;
}
