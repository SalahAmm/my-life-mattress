# 08 — Stock screen (supplier groups, KPIs, supplier management)

**What to build:** Stock matches the reference within the supplier-grouping decision (ADR-0003): three clickable KPI cards (En Stock / Stock Faible / Rupture) that filter the list; supplier header rows (icon + name + product count) with products underneath (category badge, variant rows with price, status badge, quantity); search/filter toolbar; and supplier names addable/removable (rename + soft-deactivate) with an affordance on this screen, full management in Settings. Supplier removal needs the suppliers:setActive IPC (owner-only, audited behavior). Restock/adjust actions appear when the Phase 3 feature lands — this ticket only styles what exists.

**Blocked by:** 01 — Theme system and brand tokens; 05 — Management primitives

**Status:** resolved

## Answer

Committed `feat: stock screen`. Supplier-grouped list (ADR-0003) with category badges, three clickable KPI cards with variant-level filtering, search toolbar, supplier add/remove via owner-only suppliers:setActive IPC, Sans fournisseur group. Seams A–D green; suite 155/155; typecheck clean.

- [ ] KPI cards show live counts and filter the list when clicked
- [ ] Products grouped under supplier headers; category badges intact
- [ ] Supplier add/remove works end-to-end (UI + owner-only IPC + tests)
- [ ] Tests + typecheck green
