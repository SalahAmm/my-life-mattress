# 02 — Delivery access default locked in for fresh and upgraded stores

**What to build:** A brand-new store and a store upgrading from a previous version must both default employee Delivery access to off, with the other employee delivery flags preserved during the upgrade.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Fresh database: employees_can_access_delivery is false
- [ ] Upgraded database (migrations 1–8 already applied, flags customized): migration v9 sets employees_can_access_delivery false and leaves the other delivery flags at their previous values
