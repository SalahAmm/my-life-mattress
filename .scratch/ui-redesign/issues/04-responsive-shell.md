# 04 — Responsive shell

**What to build:** The app frame adapts: a visible mobile/tablet sidebar trigger opens a Sheet navigation below the desktop breakpoint; collapsed icon rail shows localized tooltips; sidebar width and content padding respond to viewport; no horizontal page scroll at 320/768/1024/1280; dialogs are height-constrained with internal scrolling and sticky footers.

**Blocked by:** 03 — RTL shell and direction support

**Status:** resolved

## Answer

Committed `feat: responsive shell`. Mobile menu trigger + Sheet nav (closes on navigate via setOpenMobile), collapsed-rail tooltips (localized), DialogContent max-h + internal scroll, main padding p-4/md:p-6, ResizeObserver polyfill in test setup. Seams A–D green; suite 132/132; typecheck clean.

- [ ] Sidebar trigger visible below desktop breakpoint; nav opens as Sheet and closes on navigation
- [ ] No horizontal page scroll at 320, 768, 1024, 1280 in FR and AR
- [ ] Dialogs scroll internally with sticky action footers
- [ ] Tests + typecheck green
