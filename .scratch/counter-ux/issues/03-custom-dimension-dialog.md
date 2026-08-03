# 03 — Custom dimension dialog (name + dimension + price + note)

**What to build:** The Dimension Personnalisée dialog gains a Nom/couleur field and a Remarque field (both optional). The composed description (name — dimension) plus the note are stored in custom_description and print on the receipt. Roomier inputs.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

Committed with the counter redesign — dialog has name/dimension/price/note; composed description prints on the receipt. Test pin added; suite 188/188.

- [ ] Dialog has 4 roomy fields; custom item lands in the cart with the composed label
- [ ] Note appears on the receipt preview and print for custom items
- [ ] Tests + typecheck green
