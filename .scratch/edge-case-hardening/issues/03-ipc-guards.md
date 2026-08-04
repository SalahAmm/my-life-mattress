# 03 — Delivery IPC guards enforced end to end

**What to build:** When employee Delivery access is off, employee calls to list delivery sales, add a payment, or change sale status are rejected with UNAUTHORIZED; owners are never affected, and enabling access restores employee calls. Verified at the handler level, not just the helper level.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Employee: sales:list rejected when access off, allowed when on
- [ ] Employee: sales:addPayment and sales:setStatus rejected when access off
- [ ] Owner: same calls succeed regardless of the setting
