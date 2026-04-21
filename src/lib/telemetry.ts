/**
 * telemetry — T81 opt-in analytics via Plausible.
 *
 * Privacy principles:
 *   • Opt-IN only. The beacon script is never loaded until the player
 *     explicitly consents. Default is OFF.
 *   • No cookies, no cross-site tracking (Plausible design).
 *   • Events are minimal: pageview, verb_used, circle_closed.
 *   • No IP logging on a self-hosted Plausible instance.
 *   • Self-hosted ONLY: if VITE_PLAUSIBLE_HOST is unset the script is never
 *     injected — we refuse to silently fall back to the public plausible.io
 *     instance (T81 acceptance: "self-hosted"). No host → no beacon.
 *   • Full policy is documented in docs/PRIVACY.md.
 *
 * Integration:
 *   - Call `initTelemetry()` once on app boot.
 *   - It checks consent (localStorage) and injects the Plausible script
 *     only if consent is granted AND VITE_PLAUSIBLE_HOST is configured.
 *   - Use `trackEvent(name, props)` anywhere in the app.
 *   - Call `setConsent(true)` from the consent banner → loads script + persists.
 */

const CONSENT_KEY = "pp.analytics";

function readPlausibleHost(): string | null {
  try {
    // biome-ignore lint/suspicious/noExplicitAny: Vite augments ImportMeta but the type is environment-specific
    const env = (import.meta as any).env as Record<string, unknown> | undefined;
    const raw = env?.VITE_PLAUSIBLE_HOST;
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  } catch {
    /* ignore (non-Vite contexts) */
  }
  return null;
}

const PLAUSIBLE_HOST: string | null = readPlausibleHost();

let scriptInjected = false;
let consentGranted = false;
let warnedMissingHost = false;

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

function injectScript(): void {
  if (scriptInjected || typeof document === "undefined") return;

  // T81 guardrail: refuse to beacon to the public plausible.io instance.
  // A missing VITE_PLAUSIBLE_HOST means this deploy hasn't configured a
  // self-hosted endpoint — stay silent rather than exfiltrate events.
  if (!PLAUSIBLE_HOST) {
    if (!warnedMissingHost) {
      warnedMissingHost = true;
      console.warn(
        "[telemetry] VITE_PLAUSIBLE_HOST is not set; analytics beacon will not be loaded. " +
          "Set VITE_PLAUSIBLE_HOST to your self-hosted Plausible instance to enable."
      );
    }
    return;
  }

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
