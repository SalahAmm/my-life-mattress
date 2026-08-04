# 03 — Payment flows

**What to build:** Multiple partial payments that sum to the total leave remaining at zero; payments are refused on cancelled sales; the collect dialog rejects empty, zero, and negative amounts before calling the API.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] DB: two partial payments summing to total -> remaining 0, status-driven checks hold
- [ ] DB: addPayment on a cancelled sale is refused
- [ ] UI: collect dialog blocks empty/zero/negative amounts
