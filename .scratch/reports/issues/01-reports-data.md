# 01 — Reports data (reports:summary IPC)

**What to build:** An owner-only reports:summary IPC: given a date range, return revenue (excl. cancelled), deposits collected, outstanding balance, sales count, and the top 20 products (product+variant label, units, revenue). Local time ranges.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] reportSummary query correct for revenue/deposits/outstanding/count/breakdown
- [ ] Cancelled sales excluded from totals; range boundaries inclusive-exclusive
- [ ] reports:summary IPC owner-only
- [ ] Tests + typecheck green
