# 05 — Reports date ranges

**What to build:** Report ranges behave stably for from > to, same-day, empty periods, and day boundaries: no crashes, sensible empty results, and correct totals for a valid range.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] DB: from > to returns empty results without error
- [ ] DB: same-day range includes that day's sales
- [ ] UI: empty-range report renders the empty state
