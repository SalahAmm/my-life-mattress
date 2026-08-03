# 09 — Settings screen (reference layout)

**What to build:** Settings matches the reference: horizontal tab bar (Général, Produits & Catégories, Paiement, Reçu, Imprimante, Utilisateurs, Données) above a compact single-column form area; non-implemented tabs styled but disabled until their features land. The Reçu tab hosts the receipt appearance editor from ticket 02 with its live preview. Responsive at 768/1024.

**Blocked by:** 01 — Theme system and brand tokens; 05 — Management primitives

**Status:** ready-for-agent

- [ ] Tab bar renders per reference; only implemented tabs enabled
- [ ] Reçu tab (editor + live preview) fully usable in FR/AR and both themes
- [ ] No horizontal overflow at 768px
- [ ] Tests + typecheck green
