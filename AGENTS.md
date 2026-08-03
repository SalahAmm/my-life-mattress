# My Life Mattress

Offline-first POS and store management app for a single-till mattress store (Electron + Vite + React + TypeScript + SQLite).

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/<feature-slug>/` — one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Quick reference

- `npm run dev` — Vite dev server + Electron (requires `ELECTRON_RUN_AS_NODE` to be UNSET)
- `npm test` — Vitest suite
- `npm run typecheck` — tsc for app + electron configs
- `npm run build` — Vite build + esbuild main/preload bundle
- `npm start` — production-style launch
