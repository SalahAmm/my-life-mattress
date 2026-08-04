# Stock Operations Spec

The stock table lists quantities but nothing can change them. This effort adds the operational actions.

## Scope

- **Réapprovisionner**: add quantity to a variant → `restock` movement
- **Ajuster**: correct a quantity with a required reason → `adjustment` movement (never silent edits)
- **Historique**: movements history drawer per variant (sale/restock/adjustment, dates, who)
- Owner-only at the IPC layer
