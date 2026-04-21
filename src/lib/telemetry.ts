/**
 * telemetry — T81 opt-in analytics via Plausible.
 *
 * Privacy principles:
 *   • Opt-IN only. The beacon script is never loaded until the player
 *     explicitly consents. Default is OFF.
 *   • No cookies, no cross-site tracking (Plausible design).
 *   • Events are minimal: page_view, verb_used, circle_closed.
 *   • No IP logging on a self-hosted Plausible instance.
 *   • Full policy is documented in docs/PRIVACY.md.
 *
 * Integration:
 *   - Call `initTelemetry()` once on app boot.
 *   - It checks consent (localStorage) and injects the Plausible script
 *     only if granted.
 *   - Use `trackEvent(name, props)` anywhere in the app.
 *   - Call `setConsent(true)` from the consent banner → loads script + persists.
 *
 * Plausible domain: derived from the Pages deploy host.
 * When self-hosted, set VITE_PLAUSIBLE_HOST to your instance URL.
 */

const CONSENT_KEY = "pp.analytics";
const PLAUSIBLE_HOST =
  // biome-ignore lint/suspicious/noExplicitAny: Vite augments ImportMeta but the type is environment-specific
  (typeof (import.meta as any).env?.VITE_PLAUSIBLE_HOST === "string"
    ? // biome-ignore lint/suspicious/noExplicitAny: same as above
      (import.meta as any).env.VITE_PLAUSIBLE_HOST
    : undefined) ?? "https://plausible.io";

let scriptInjected = false;
let consentGranted = false;

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

function injectScript(): void {
  if (scriptInjected || typeof document === "undefined") return;
  scriptInjected = true;

  const domain = window.location.hostname;
  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = domain;
  script.src = `${PLAUSIBLE_HOST}/js/script.js`;
  document.head.appendChild(script);
}

export function initTelemetry(): void {
  consentGranted = readConsent();
  if (consentGranted) injectScript();
}

export function hasConsent(): boolean {
  return consentGranted;
}

export function setConsent(granted: boolean): void {
  consentGranted = granted;
  try {
    if (granted) {
      localStorage.setItem(CONSENT_KEY, "true");
    } else {
      localStorage.removeItem(CONSENT_KEY);
    }
  } catch {
    /* ignore */
  }
  if (granted) injectScript();
}

/** Track a custom Plausible event. No-ops when consent not granted. */
export function trackEvent(name: string, props?: Record<string, string | number | boolean>): void {
  if (!consentGranted) return;

  // Plausible exposes window.plausible once the script is loaded.
  // biome-ignore lint/suspicious/noExplicitAny: Plausible is injected at runtime and not typed
  const plausible = (window as any).plausible;
  if (typeof plausible === "function") {
    plausible(name, props ? { props } : undefined);
  }
}

/** Convenience: track a verb used event. */
export function trackVerbUsed(verb: string): void {
  trackEvent("verb_used", { verb });
}

/** Convenience: track circle closed. */
export function trackCircleClosed(seed: number, turnCount: number): void {
  trackEvent("circle_closed", { seed: String(seed), turn_count: turnCount });
}
