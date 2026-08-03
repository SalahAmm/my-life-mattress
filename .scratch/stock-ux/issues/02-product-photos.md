# 02 — Product photos

**What to build:** One optional photo per product. Upload via file picker (copied to userData/products/), stored as `image_path`. Shown on the Counter product card (replacing the letter tile) and as a thumbnail in Stock; letter-tile fallback when no photo. The app-asset protocol serves the products folder.

**Blocked by:** None — can start immediately (independent of 01).

**Status:** resolved

## Answer

Committed `feat: product photos`. Migration v3 (products.image_path), products:uploadImage IPC (userData/products), app-asset protocol serves logos+products, counter card image / stock thumbnail / form upload with letter fallback, variant validation now name-or-dimension. Suite 171/171; typecheck clean.

- [ ] Migration v2 adds `image_path` to products (nullable)
- [ ] products:uploadImage IPC (owner-only) copies the file and returns the path
- [ ] Counter card and Stock row render the photo with letter-tile fallback
- [ ] Tests + typecheck green
