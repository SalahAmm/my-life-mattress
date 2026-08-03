# 02 — Counter redesign (tiles → products → chooser)

**What to build:** Vente Rapide becomes: search bar (matches name/color/size) + category tiles → tap a type → its product cards (photo + name) → tap a product → chooser dialog with color chips + size chips rows (each filters the other to existing combos; near-end chips show "Plus que X") and an OK button that adds the selected variant to the cart. A top-sellers row (top 6) sits above the tiles. A banner at the top warns when the selected variant is at/below threshold. Employee availability renders as Rupture / Plus que X / Plus de {seuil}. The ADR-0002 post-sale flow is unchanged.

**Blocked by:** 01 — Counter data layer

**Status:** claimed

- [ ] Category tiles → product grid → chooser dialog with OK flow works end-to-end
- [ ] Color/size rows filter each other; custom entry available in the chooser
- [ ] Top-sellers row renders and sells
- [ ] Search matches name, color, size
- [ ] Near-end banner + "Plus que X" chips; employee availability wording per spec
- [ ] Cart, deposit, save → preview → Terminer flow intact (ADR-0002)
- [ ] Tests + typecheck green
