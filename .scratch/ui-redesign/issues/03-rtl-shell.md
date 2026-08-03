# 03 — RTL shell and direction support

**What to build:** Arabic mode fully mirrors the application: Radix DirectionProvider wraps the app, the sidebar moves to the right (side="right"), dialogs/selects/menus behave RTL, direction is set before first paint (no LTR flash), and remaining physical utilities (left/right, pl/pr) are replaced with logical ones (start/end, ps/pe). Money, quantities, phones, and dates stay LTR; names/free text stay dir="auto"; only directional icons flip.

**Blocked by:** 01 — Theme system and brand tokens

**Status:** ready-for-agent

- [ ] Switching to Arabic moves the sidebar to the right and mirrors layouts
- [ ] No LTR flash on load; html lang/dir correct before render
- [ ] Radix components (selects, dialogs, dropdowns) position correctly in RTL
- [ ] Numeric fields remain LTR inside Arabic UI
- [ ] Tests + typecheck green
