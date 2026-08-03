# 04 — Stock fixes (supplier delete confirm + toast audit)

**What to build:** The supplier delete action on the stock chips works reliably and asks for confirmation (Confirmer/Annuler) before removing. Every mutation in Stock/Settings shows its own toast message — no generic "Produit ajouté" on unrelated actions.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

Committed fix: supplier chip delete asks confirmation (Annuler/Supprimer); distinct FR/AR toasts per action. Suite 188/188; typecheck clean.

- [ ] Chip delete opens a confirmation dialog; confirm calls setActive(false); cancel does nothing
- [ ] Distinct FR/AR toast messages: product added/modified/deactivated, supplier added/removed, preset added
- [ ] Tests + typecheck green
