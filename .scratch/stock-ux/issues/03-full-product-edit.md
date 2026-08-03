# 03 — Full product edit

**What to build:** An Edit action per product on the Stock screen opens the product form pre-filled (name, category, supplier, variants incl. names, photo) and saves changes via a new owner-only products:update IPC. This is how existing products get photos and how mistakes get fixed.

**Blocked by:** 01 — Variant name field; 02 — Product photos

**Status:** claimed

- [ ] products:update IPC (owner-only, zod-validated) updates name/category/supplier/variants
- [ ] Edit dialog reuses the product form pre-filled; save reflects in Stock + Counter
- [ ] Tests + typecheck green
