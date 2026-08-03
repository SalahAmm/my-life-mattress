# 01 — Wilayas + counter wilaya/address fields

**What to build:** A shared constant of Algeria's 58 wilayas (French names). The counter checkout gains two fields: a wilaya quick-select (58 presets + free-text custom entry) and a delivery address free-text input. Both persist on the sale (schema columns already exist).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 58 wilayas constant, no duplicates
- [ ] Counter checkout: wilaya select (presets + custom text) + address input
- [ ] Sale payload carries wilaya/deliveryAddress; validated and persisted
- [ ] Tests + typecheck green
