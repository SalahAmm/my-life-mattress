# Counter UX Spec

Grilled decisions for the Vente Rapide redesign + stock fixes.

## Decisions locked

- **Counter flow**: search bar + category tiles → product cards → chooser dialog (color chips row + size chips row, filter each other to real combos) → OK adds to cart.
- **Top-sellers row**: top 6 products by sales count, auto-updating.
- **Search**: matches product name, color name, size.
- **Near-end**: per-variant threshold (default 3); banner at top for selected variant; "Plus que X" on low chips.
- **Employee availability (vague)**: Rupture at 0 / "Plus que X" at/below threshold / "Plus de {seuil}" when healthy. Exact quantities owner-only.
- **Custom dimension dialog**: Nom/couleur + Dimension + Prix + Remarque (note prints on the receipt).
- **Supplier delete**: confirmation popup (Confirmer/Annuler) + working action.
- **Toasts**: distinct per action ("Produit modifié", "Fournisseur supprimé", "Préréglage ajouté"…).
- **Add-product dialog**: all strings i18n'd; roomy layout (wider dialog, taller inputs).
- **Responsive**: stock table scrolls, screens adapt at 768/1024.
