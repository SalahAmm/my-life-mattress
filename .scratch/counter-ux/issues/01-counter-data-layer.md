# 01 — Counter data layer (top-sellers + employee-safe availability)

**What to build:** The counter's data supports the redesign: a top-sellers query (top 6 products by quantity sold, from sale history) exposed via IPC for both roles, and each counter variant carries employee-safe availability fields — `low_stock` (at/below threshold, default 3), `available_low` (exact count when low, else null), and `available_above` (threshold when healthy). Exact quantities never reach the renderer for employees.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] products:topSellers returns top 6 by units sold
- [ ] Counter variants expose low_stock / available_low / available_above (no raw qty)
- [ ] Owner still gets exact quantities via the stock list IPC
- [ ] Tests + typecheck green
