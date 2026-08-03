# 08 — Variant editor reorder + preset chips + quick-add

**What to build:** The variant editor becomes two clean rows per block (Row 1: Dimension + Nom (couleur); Row 2: Prix + Stock initial + Seuil d'alerte). A preset chips row above the fields fills the dimension with one tap (still editable); a small + saves the currently typed dimension as a new preset (inline quick-add).

**Blocked by:** 07 — Dimension presets

**Status:** resolved

## Answer

Committed feat: variant editor preset chips + quick-add. Chips fill the first empty dimension or append a row; the + saves the typed dimension as a preset via settings:updateReceipt. Suite 186/186; typecheck clean.

- [ ] Row 1 dim+name, Row 2 price+stock+threshold per variant block
- [ ] Chips from settings fill the dimension field on tap
- [ ] Quick-add + persists a new preset
- [ ] Tests + typecheck green
