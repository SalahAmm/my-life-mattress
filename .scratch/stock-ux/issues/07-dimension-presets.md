# 07 — Dimension presets (storage + management)

**What to build:** A store-wide configurable list of dimension presets (default `90x190, 160x190, 180x200`). Migration v4 adds `dimension_presets` (JSON list) to the store settings row; Settings › Produits & Catégories becomes functional with add/remove controls (owner-only, validated, no duplicates, max 20).

**Blocked by:** None — can start immediately.

**Status:** claimed

- [ ] Migration v4 seeds the three defaults
- [ ] get/update settings round-trip the list; update IPC validates (non-empty, unique, ≤20)
- [ ] Settings › Produits & Catégories tab manages the list (owner-only)
- [ ] Tests + typecheck green
