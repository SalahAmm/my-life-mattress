# UI Redesign Spec

Reference-driven visual system for My Life Mattress, per the grill-with-docs session (ADR-0001/0002/0003).

## Decisions locked

- Desktop-first + responsive (320 / 768 / 1024 / 1280+)
- Dark mode kept (navy-anchored), light mode matches the reference prototype
- Square corners (radius 0); navy sidebar; royal-blue primary; gold for logo + highest-priority action
- Supplier-grouped Stock with KPI filter cards; suppliers addable/removable
- Counter: two-pane desktop, sticky bottom bar + checkout sheet below ~1024px
- Zero-stock sale allowed with warning badge (no block)
- Post-sale: preview stays until "Terminer la vente" (explicit reset; ADR-0002)
- Browser print for all 3 documents (Electron native + browser window)
- Receipt appearance editable in Settings › Reçu (store name, logo, phone, quantity, delivery-note toggles; totals/remaining/line items fixed) — live preview = exact print output
- Supplied logo used in Login, sidebar, receipt, Settings

## Constraints

- Employees never see Stock/Reports/Settings/suppliers (IPC-enforced)
- No Bolt watermark anywhere
- Print only for: ticket de commande, bon de livraison, rapport des ventes
