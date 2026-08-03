# 03 — Delivery screen

**What to build:** The Livraison screen: KPI cards (En attente / Livré / À encaisser — aggregate owner-only, hidden for employees), status filter tabs, orders grouped by wilaya (count badge per group), order cards with items, Total / Payé (green) / Solde dû (red, prominent), and actions: Encaisser le Solde (addPayment balance) and Marquer comme Livré (collect-balance-first: prompts an inline payment entry when a balance remains, then marks delivered).

**Blocked by:** 01 — Wilayas + counter fields; 02 — Delivery data

**Status:** claimed

- [ ] KPI cards with live counts; À encaisser card owner-only
- [ ] Orders grouped by wilaya with status tabs and search
- [ ] Encaisser le Solde adds a balance payment and updates the card
- [ ] Marquer comme Livré collects first when balance > 0, then marks delivered
- [ ] Tests + typecheck green
