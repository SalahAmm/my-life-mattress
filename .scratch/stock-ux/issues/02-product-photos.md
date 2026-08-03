# 02 — Product photos

**What to build:** One optional photo per product. Upload via file picker (copied to userData/products/), stored as `image_path`. Shown on the Counter product card (replacing the letter tile) and as a thumbnail in Stock; letter-tile fallback when no photo. The app-asset protocol serves the products folder.

**Blocked by:** None — can start immediately (independent of 01).

**Status:** ready-for-agent

- [ ] Migration v2 adds `image_path` to products (nullable)
- [ ] products:uploadImage IPC (owner-only) copies the file and returns the path
- [ ] Counter card and Stock row render the photo with letter-tile fallback
- [ ] Tests + typecheck green
