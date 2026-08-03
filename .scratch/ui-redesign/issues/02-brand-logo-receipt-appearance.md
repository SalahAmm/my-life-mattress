# 02 — Brand logo and editable receipt appearance

**What to build:** The supplied My Life Mattress logo appears in Login, the sidebar header, Settings, and the receipt template (fallback: gold tile when no logo configured). Settings › Reçu becomes a receipt appearance editor: store name, logo upload, and toggles for phone, quantity, and delivery-note lines — all persisted, honored by the actual print templates (no forced values), and reflected instantly in the live preview. Totals, remaining balance, and line items stay fixed. The owner can change the receipt look without touching code.

**Blocked by:** 01 — Theme system and brand tokens

**Status:** claimed

- [ ] Logo renders in Login, sidebar, Settings preview, and printed receipt (data URI in print, app-asset URL in preview)
- [ ] Receipt toggles (phone/quantity/delivery note) and store name persist and change actual printed output
- [ ] Settings › Reçu live preview always equals the printed template (same renderer)
- [ ] Employee session cannot reach the editor or its IPC handlers
- [ ] Tests + typecheck green
