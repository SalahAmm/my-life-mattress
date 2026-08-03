# 10 — Stock dense table

**What to build:** The Stock list becomes a dense stock-management table — one row per variant: Photo | Produit + variante | Catégorie | Fournisseur | Prix | Stock (qty + status badge) | Actions (Éditer / Dupliquer / Désactiver). Sortable by Produit, Prix, Stock, Fournisseur; sticky header. KPI cards, supplier/category chips, and search stay above. The supplier-less group becomes a "—" supplier column.

**Blocked by:** 03 — Full product edit; 09 — Duplicate product

**Status:** resolved

## Answer

Committed feat: stock dense table. One row per variant, sortable headers, sticky header, photo column, chips/KPI/search all combine, supplier chip X removes suppliers. Suite 189/189; typecheck clean.

- [ ] One row per variant with all columns; photo + letter fallback
- [ ] Sortable headers work; sticky header
- [ ] Chips/KPI/search still filter the table
- [ ] Actions: Éditer (03), Dupliquer (09), Désactiver
- [ ] Tests + typecheck green
