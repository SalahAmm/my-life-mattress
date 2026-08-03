# 03 — Full product edit

**What to build:** An Edit action per product on the Stock screen opens the product form pre-filled (name, category, supplier, variants incl. names, photo) and saves changes via a new owner-only products:update IPC. This is how existing products get photos and how mistakes get fixed.

**Blocked by:** 01 — Variant name field; 02 — Product photos

**Status:** resolved

## Answer

Committed `feat: full product edit`. products:update IPC (owner-only, standalone zod schema — safeExtend can't override keys), edit dialog pre-filled from stock rows, variants updated in place / appended (removal deliberately unsupported — sales history references variants). Suite 184/184; typecheck clean.

- [ ] products:update IPC (owner-only, zod-validated) updates name/category/supplier/variants
- [ ] Edit dialog reuses the product form pre-filled; save reflects in Stock + Counter
- [ ] Tests + typecheck green
