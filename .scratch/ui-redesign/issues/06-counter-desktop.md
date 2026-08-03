# 06 — Counter (desktop)

**What to build:** The counter matches the reference: visual product cards (placeholder letter tile, name, variant count + from-price), category pills, search row with the Dimension Personnalisée button, and one coherent checkout panel (cart lines with qty controls, customer fields, payment presets + custom, totals, gold Enregistrer). Post-sale flow per ADR-0002: save → receipt preview stays open → user chooses Imprimer / Imprimer via navigateur / Terminer la vente; the cart resets only on Terminer. Zero-stock variants stay sellable with a warning badge.

**Blocked by:** 01 — Theme system and brand tokens; 05 — Management primitives

**Status:** resolved

## Answer

Committed `feat: counter ADR-0002 post-sale flow`. Preview stays open after save; cart/form reset only via Terminer la vente; reprint banner when preview closed; Enregistrer save-locked while a sale is open; gold accent on Enregistrer. Seams A–E green; suite 137/137; typecheck clean.

- [ ] Full sale end-to-end from the new UI (product → variant → custom dimension → customer → deposit → save → preview)
- [ ] Cart/form reset only on "Terminer la vente"; closing preview or failed print never loses the sale
- [ ] Zero-stock variant sellable with visible warning
- [ ] No double-submit on Enregistrer
- [ ] Tests + typecheck green
