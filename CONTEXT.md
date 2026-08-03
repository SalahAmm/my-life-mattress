# My Life Mattress

A single-till, offline-first point-of-sale and store management app for one mattress store counter PC. The UI language is French, with a full Arabic/RTL mirror. Terms below are the canonical vocabulary for issue titles, test names, and code.

## Language

**Vente**:
A sale recorded at the counter — one customer, one or more line items, optional payment, one of three statuses (`ordered`, `delivered`, `cancelled`).
_Avoid_: transaction, purchase

**Ticket de commande**:
The customer-facing receipt printed for a sale.
_Avoid_: reçu, bill, invoice

**Acompte**:
A partial payment taken at sale time, stored as a flat DZD amount. When entered as a percentage, the percentage is display metadata only.
_Avoid_: deposit, down payment

**Reste à payer**:
Total minus sum of payments for a sale. Always computed, never stored.

**Paiement complet**:
A payment covering the full sale total in one entry.

**Panier**:
The set of line items being assembled before a sale is saved on the counter.

**Produit**:
A catalog item (e.g. "Matelas Orthopédique Elite") with one or more variants.
_Avoid_: article, item

**Variante**:
A dimension/price combination of a product (e.g. "160×190"). The pricing unit for stock and sales.
_Avoid_: size, option, SKU

**Dimension Personnalisée**:
A one-off line item with no catalog product behind it — typed dimension and price, exists only for one sale, never touches stock or products.

**Fournisseur**:
The person the store buys products from (e.g. Rafik, Ahmed). Products belong to one supplier; the Stock screen is grouped by supplier.
_Avoid_: vendor, seller

**Stock**:
The quantity on hand of a variant. States: En Stock, Stock Faible (≤ threshold), Rupture (0).

**Réapprovisionnement**:
A positive stock movement with reason `restock`.

**Ajustement**:
A manual stock correction with reason `adjustment` and a required reason.

**Bon de livraison**:
The delivery slip printed for an `ordered` sale, showing the live reste à payer.

**Wilaya**:
Algerian delivery region; entered as preset list or free text on the counter.

**Propriétaire**:
The owner role — full access including Stock, Rapports, Paramètres, backups.
_Avoid_: admin, boss

**Employé**:
The employee role — counter, delivery desk and guide only. Never sees revenue aggregates, stock management, suppliers, or settings; enforced at the IPC layer, not the UI.

**Impression (Électron)**:
Printing through Electron's native print pipeline (system print dialog).

**Impression (Navigateur)**:
Printing the same generated document through a dedicated Chromium window (`window.print()`).

## Rules

- Money (DZD), quantities, phone numbers, and dates always render LTR, even inside Arabic UI. Names and free text use `dir="auto"`.
- A sale's line items are immutable after creation; mistakes are fixed by cancelling and re-creating.
- Stock deduction happens atomically with sale creation, never as a separate step.
