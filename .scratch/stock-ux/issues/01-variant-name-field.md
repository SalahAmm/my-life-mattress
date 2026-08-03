# 01 — Variant name field (bed colors)

**What to build:** Variants carry an optional name (the specific color name for beds, e.g. "Sahara") in addition to the dimension. The product form gains the field; the variant label displays name first, size fallback, "Name — Size" when both — everywhere: counter variant buttons, stock rows, receipts, custom flows.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

Committed `feat: variant name field`. Migration v2 adds `name` to product_variants; shared variantLabel (name → size → both); form field; counter/stock/receipt render the new label. Suite 167/167; typecheck clean.

- [ ] Migration v2 adds `name` to product_variants (nullable) and makes dimension nullable
- [ ] Product create accepts variant names; label logic unit-tested (name → size → both)
- [ ] Counter variant buttons, stock rows, and receipts render the new label
- [ ] Tests + typecheck green
