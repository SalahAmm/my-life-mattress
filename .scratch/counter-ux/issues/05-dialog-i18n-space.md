# 05 — Add-product dialog i18n + roomy layout

**What to build:** Every string in the product dialog is translated (no stray French in Arabic mode) and the layout gives each field room — wider dialog, taller inputs, space for 2-3 words per detail.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

Committed fix: dialog widened (max-w-4xl) with taller inputs; i18n audit clean (no hardcoded strings). Suite 188/188.

- [ ] No hardcoded strings remain in the dialog (audit + keys)
- [ ] Dialog is wider with taller inputs; fields show 2-3 words comfortably
- [ ] Tests + typecheck green
