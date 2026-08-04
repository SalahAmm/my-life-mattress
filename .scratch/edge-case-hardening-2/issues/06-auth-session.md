# 06 — Auth and session

**What to build:** A deactivated user's live session is invalidated on the next IPC call; a wrong recovery code is rejected; deactivating the last active owner stays blocked.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Service: deactivated user session returns no session
- [ ] Service: wrong recovery code throws RECOVERY_CODE_INVALID
- [ ] Query: last active owner cannot be deactivated
