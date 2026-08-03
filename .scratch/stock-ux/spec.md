# Stock UX Spec

Grilled decisions for the stock-ux effort (variant colors, photos, edit, filter chips) + GitHub push.

## Decisions locked

- **Variant name field**: optional `name` on product_variants (bed color names like "Sahara"); dimension stays for mattresses. Migration v2 (dimension becomes nullable via table rebuild).
- **Variant label**: name first → size fallback → "Name — Size" when both; used on counter buttons, stock rows, receipts.
- **Product photos**: one optional photo per product, file picker → userData/products/, shown on Counter card (replaces letter tile) and Stock thumbnail; letter tile fallback.
- **Full product edit**: edit action per product (photo, name, category, supplier, variants) — reuses the add form.
- **Filter chips**: combinable supplier + category chip rows, independent toggles, combined with KPI state filter and search.
- **GitHub**: gh CLI installed, `gh auth login`, private repo, master→main rename, push.
