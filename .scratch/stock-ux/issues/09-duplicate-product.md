# 09 — Duplicate product

**What to build:** A "Dupliquer" action on stock rows opens the product form pre-filled from the copied product — variants (names, dimensions, prices, thresholds) and photo copied, stock quantities reset to 0. Creates a new product in one save.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

Committed feat: duplicate product. Copy action pre-fills the form (variants + photo, stock 0), creates via products:create. Suite 187/187; typecheck clean.

- [ ] Row action opens the form pre-filled; save creates a new product
- [ ] Stock quantities start at 0 on the copy
- [ ] Tests + typecheck green
