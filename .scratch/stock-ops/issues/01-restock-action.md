# 01 — Restock action

**What to build:** A "Réapprovisionner" action per stock row: dialog with quantity → owner-only stock:restock IPC → `restock` movement + toast. Stock list refreshes.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

Resolved: stock:restock IPC (owner-only) + row dialog. Suite 206/206.

- [ ] stock:restock IPC (owner-only) with validation
- [ ] Row action + dialog; movement recorded with reason restock
- [ ] Tests + typecheck green
