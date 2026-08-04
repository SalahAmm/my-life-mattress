# 01 — Employee delivery settings survive every settings save

**What to build:** Changing deposit presets, receipt format, or dimension presets must never reset the owner's delivery permissions (delivery access, delivered-history visibility, collect-and-deliver). Today those saves omit the delivery flags and the update path writes them as off.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Saving payment presets keeps employees_can_access_delivery, employees_see_delivered and employees_can_collect_deliver unchanged
- [ ] Saving receipt format keeps the delivery flags unchanged
- [ ] Saving dimension presets keeps the delivery flags unchanged
- [ ] The main-process settings update falls back to stored values when flags are absent from the payload
