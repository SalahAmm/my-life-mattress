# 07 — Counter (narrow)

**What to build:** Below ~1024px the cart leaves the side panel: a sticky bottom bar shows item count + total + "Voir le panier", opening a full-height checkout Sheet containing cart, customer, payment, totals, and Enregistrer. Desktop layout unchanged. Checkout sheet works in FR/AR and both themes.

**Blocked by:** 06 — Counter (desktop)

**Status:** resolved

## Answer

Committed `feat: narrow counter`. useIsNarrow (1024 breakpoint) drives a sticky bottom bar (count + LTR total + Voir le panier) and a full-height checkout Sheet; CheckoutPanel extracted and shared with the desktop column; full sale completable from the sheet. Seams A–D green; suite 147/147; typecheck clean.

- [ ] Sticky bottom bar appears below 1024px with live count/total
- [ ] Checkout sheet completes the same sale flow as desktop
- [ ] No duplicate sale risk when switching modes mid-sale
- [ ] Tests + typecheck green
