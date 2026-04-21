---
title: Privacy Policy
updated: 2026-04-20
status: current
domain: ops
---

# Privacy Policy

## Short version

Petitio Principii is a client-side text adventure. It does not require an account, does not collect personal data, and does not use third-party tracking cookies.

Optional, opt-in analytics may be enabled if you choose. They are privacy-first and fully auditable.

---

## Data we collect

### Without analytics (default)

Nothing is sent to any server. The game runs entirely in your browser. The following data is stored **locally in your browser only** and never transmitted:

| Key | Purpose | Expiry |
|-----|---------|--------|
| `pp.lang` | Your language preference | Until you clear storage |
| `pp.dyslexia` | Dyslexia font toggle | Until you clear storage |
| `pp.textSize` | Text size preference | Until you clear storage |
| `pp.analytics` | Your analytics consent choice | Until you clear storage |
| `pp.analytics.decided` | Whether you have seen the consent banner | Until you clear storage |

### With analytics (opt-in)

If you opt in via the consent banner, we load the [Plausible Analytics](https://plausible.io) script. Plausible is privacy-respecting by design:

- **No cookies** — Plausible does not set any cookies.
- **No cross-site tracking** — each event is tied only to the current domain.
- **No personal data** — Plausible uses a daily-rotating hash of IP + user agent to estimate unique visitors. The raw IP is never stored.
- **GDPR, CCPA, PECR compliant** by design (see [Plausible's GDPR statement](https://plausible.io/data-policy)).

#### Events we send

| Event | Properties | Why |
|-------|-----------|-----|
| `pageview` | URL path, referrer | Understand how players find the game |
| `verb_used` | `verb` (e.g. "accept") | Understand which rhetorical moves are used |
| `circle_closed` | `seed`, `turn_count` | Understand game completion patterns |

We never send: player name, email, seed phrase, transcript content, or any personally identifying information.

#### Self-hosted instance

The Plausible instance is self-hosted at `VITE_PLAUSIBLE_HOST` (configured at build time). The analytics data never leaves infrastructure we control.

If `VITE_PLAUSIBLE_HOST` is not set at build time, the analytics script is **never loaded** and no events are sent. We explicitly refuse to fall back to the public `plausible.io` instance — a missing host means "this deploy has no analytics endpoint configured," not "silently exfiltrate events to a third party."

## Opting out

If you previously opted in and want to opt out:

1. Open your browser's developer tools → Application → Local Storage → `pp.analytics`
2. Delete the key (or set its value to anything other than `"true"`).
3. Delete `pp.analytics.decided` to see the consent banner again on your next visit.

Alternatively, use your browser's standard privacy controls to clear site data.

## Contact

This game is open source. Review the full codebase at the repository linked in the README. Report privacy concerns by opening a GitHub issue.
