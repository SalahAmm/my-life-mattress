# 03 — Report print + CSV export

**What to build:** A4 tabular report template (shared/printing/report.ts, same fonts/logo pipeline) printed via the existing preview + Electron + browser flow, and a CSV export (UTF-8 BOM, proper escaping) with a formatted-table preview before saving.

**Blocked by:** 01 — Reports data; 02 — Reports screen

**Status:** resolved

## Answer

Committed feat: report print + CSV. Suite 218/218; typecheck clean.

- [ ] A4 template renders totals + breakdown table; print works via preview
- [ ] CSV export opens in Excel/Sheets with Arabic/French intact (BOM + escaping)
- [ ] Both actions preview before running
- [ ] Tests + typecheck green
