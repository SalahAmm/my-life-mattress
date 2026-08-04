# 01 — Utilisateurs tab

**What to build:** users:list, users:create (employee, username unique + password), users:resetPassword, users:setActive — all owner-only — plus guards (cannot deactivate self, cannot deactivate the last active owner) and the Utilisateurs tab UI (list with role/active badge, create dialog, reset password dialog, deactivate/activate).

**Blocked by:** None

**Status:** ready-for-agent

- [ ] Guard: cannot deactivate self or the last active owner
- [ ] Employee account created with hashed password can log in
- [ ] Tab UI: list + create + reset + toggle active
- [ ] Tests + typecheck green
