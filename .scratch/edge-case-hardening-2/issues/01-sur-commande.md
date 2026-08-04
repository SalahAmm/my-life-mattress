# 01 — Sur commande flow locked in

**What to build:** Selling from zero or insufficient stock stays possible (sur commande). Confirming a sale with 0 stock succeeds, stock goes negative, the variant stays "Rupture", the movement history records the sale, and the stock UI renders negative counts.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] DB: sale with more items than stock leaves a negative quantity on hand and records the movement
- [ ] Counter UI: an out-of-stock variant can be added to the cart and the sale confirmed
- [ ] Stock UI: negative and zero quantities render as "Rupture" without errors
