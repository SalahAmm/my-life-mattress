# 02 — Delivery data (sales list IPC)

**What to build:** A sales:list IPC (both roles) returning sales with customer, items, payments, computed totals/paid/remaining — filterable by status (ordered/delivered/cancelled) — for the delivery screen. Per-order remaining balance is always included; no store-wide aggregates.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] listSales query with status filter (default ordered)
- [ ] sales:list IPC + preload + types
- [ ] Tests + typecheck green
