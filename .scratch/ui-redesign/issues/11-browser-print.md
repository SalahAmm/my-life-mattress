# 11 — Browser print for all documents

**What to build:** Every document preview (ticket de commande, bon de livraison, rapport des ventes) offers both transports: "Imprimer" (Electron native pipeline) and "Imprimer via navigateur" (dedicated Chromium print window rendering the exact same HTML, fonts, logo, locale, and settings, then triggering the system print dialog via window.print()). The post-sale preview also shows "Terminer la vente" per ADR-0002; a cancelled browser print never clears the sale. Delivery-slip and report previews are wired when those documents land (Phases 3–4) — the receipt is wired in this ticket.

**Blocked by:** 06 — Counter (desktop)

**Status:** claimed

- [ ] "Imprimer via navigateur" opens the print window with the identical document and triggers the print dialog
- [ ] Sale state safe on cancel/failure; cart resets only via Terminer la vente
- [ ] Print output identical between Electron and browser transports
- [ ] Tests + typecheck green
