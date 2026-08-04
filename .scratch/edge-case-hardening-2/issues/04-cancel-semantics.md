# 04 — Cancel semantics

**What to build:** Cancelling an ordered sale restores stock, records the movement, marks the sale cancelled, and keeps its payments in history. Cancelling a delivered sale behaves the same. No behavior change unless a bug surfaces.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] DB: cancel ordered sale restores stock and records a movement
- [ ] DB: cancel delivered sale restores stock and marks cancelled
- [ ] DB: payments remain visible on the cancelled sale
