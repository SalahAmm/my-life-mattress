# 02 — Stock boundaries

**What to build:** Restock and adjustment APIs reject zero and negative quantities with VALIDATION_ERROR; the low-stock boundary (quantity equal to threshold) shows "Stock Faible"; negative quantities never crash the stock screen.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] IPC: restock and adjust reject quantity <= 0
- [ ] Boundary: quantity == threshold renders "Stock Faible"
- [ ] Boundary: quantity just above threshold renders "En Stock"
