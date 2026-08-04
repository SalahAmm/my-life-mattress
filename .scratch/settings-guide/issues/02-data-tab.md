# 02 — Données tab (backup / restore)

**What to build:** files:backupDatabase (copy the DB to a chosen path via save dialog) and files:restoreDatabase (pick a backup, verify it, replace the live DB; warn that data is replaced and the app restarts). Owner-only.

**Blocked by:** None (can be done in parallel with 01)

**Status:** resolved

## Answer

Committed feat: Données tab. Suite 236/236; typecheck clean.

- [ ] Backup writes a full copy to the chosen location
- [ ] Restore validates the picked file (SQLite header), backs up the current DB, replaces it, flags restart
- [ ] Tests + typecheck green
