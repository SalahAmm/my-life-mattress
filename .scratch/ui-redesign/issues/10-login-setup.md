# 10 — Login and Setup screens (brand restyle)

**What to build:** First-run owner setup and login screens use the supplied logo, brand palette, and reference layout: centered card on the light gray gradient, labeled inputs with leading icons, full-width navy primary button, forgot-password recovery flow intact, theme/language toggles top-right. No demo-account buttons (never ships — security requirement). Responsive at 320/768.

**Blocked by:** 01 — Theme system and brand tokens; 02 — Brand logo and editable receipt appearance

**Status:** resolved

## Answer

Committed with the UI redesign pass; tests lock the contract.

- [ ] Login and setup screens show the supplied logo and brand styling
- [ ] First-run routing (setup vs login) and recovery flow unchanged and tested
- [ ] No demo accounts, no prefilled credentials
- [ ] Tests + typecheck green
