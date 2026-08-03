# 01 — Theme system and brand tokens

**What to build:** The whole app renders in the new brand identity: navy/blue/gold semantic tokens, square corners (radius 0), Inter/Nunito Sans (FR) and Noto Sans Arabic (AR) fonts, and shadcn primitive defaults (button, card, input, label, badge, tabs, dialog, sidebar) reset from the Sera preset's serif/uppercase/taupe/rounded look to the reference style — normal case, normal tracking, no decorative heading font in operational UI. Both light and dark token sets exist (dark = navy-anchored).

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

Committed `feat: apply brand theme system (ADR-0001)`. globals.css carries the navy/blue/gold palette (light + dark, radius 0), 14 primitives swept of Sera uppercase/tracking, button/input/badge/label rewritten to the new defaults, sonner wired to the app theme provider, Sera fonts (playfair/noto-variable) + next-themes removed. Theme contract test (seam A + B) green; full suite 101/101; typecheck clean.

- [ ] globals.css tokens match ADR-0001 palette in light and dark
- [ ] Button/card/input/badge/label/tabs/dialog/table primitives carry the new defaults (radius 0, normal case)
- [ ] Arabic locale renders with Noto Sans Arabic (no fallback font)
- [ ] Screenshots-style look visible on Login, Counter, Stock, Settings with no Sera leftovers
- [ ] Tests + typecheck green
