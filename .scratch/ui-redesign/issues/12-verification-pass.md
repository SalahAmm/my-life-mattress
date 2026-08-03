# 12 — Verification pass

**What to build:** The full redesign verified: RTL and responsive behavior across 320/768/1024/1280 in FR and AR, light and dark themes, logo rendering in all four placements, both print transports, receipt appearance editor effects on real output, and no regressions in the sale/stock/auth flows. Fix whatever the pass surfaces. Manual review checklist + automated coverage for the new seams.

**Blocked by:** all tickets 01–11

**Status:** ready-for-agent

- [ ] All four viewports × FR/AR × light/dark render without overflow, clipped dialogs, or broken nav
- [ ] Automated tests cover RTL sidebar placement, responsive counter mode, logo rendering, print transports, and receipt toggles
- [ ] Full test suite + typecheck green
