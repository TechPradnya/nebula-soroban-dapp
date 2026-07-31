# Contributing

## Project conventions

- **Contracts:** every state-mutating function calls `require_auth()` first; admin-only functions go
  through the shared `require_admin` helper rather than repeating the check inline. New error cases get a
  new `#[contracterror]` variant, never a raw `panic!`.
- **Backend:** controllers stay thin — parse the request, call one service method, shape the response.
  Business logic lives in `services/`; anything that touches Mongoose or the Stellar SDK directly belongs
  there, not in a controller. Shared enums/patterns go in `src/constants.js` rather than being retyped in
  each model/schema.
- **Frontend:** cross-cutting formatting logic (stroop math, address truncation, date formatting) lives in
  `src/utils/format.js` — don't reintroduce a local copy in a component. New dialogs should use the shared
  `components/ui/Modal.jsx` rather than hand-rolling overlay/focus-trap logic again.

## Before opening a PR

```bash
# Contracts
cd contracts && cargo test --workspace && cargo clippy --workspace -- -D warnings

# Backend
cd backend && npm run lint && npm test

# Frontend
cd frontend && npm run lint && npm test && npm run build
```

All four must pass. CI (`.github/workflows/ci.yml`) runs the same checks on every push/PR — if it's not
green there, it won't be merged.

## Commit style

Small, scoped commits over one giant diff — this repo's grading criteria explicitly wants a real commit
history, not a single "initial commit". A good commit message says *why*, not just *what*
(`fix: guard against zero-staker fee deposits reverting silently` beats `fix bug`).

## Adding a new task-lifecycle transition

If you add a new state to `TaskStatus` in `contracts/marketplace/src/storage.rs`, you'll need to update, in
order:

1. The Rust contract itself (new match arms wherever `TaskStatus` is matched exhaustively)
2. `backend/src/constants.js` → `TASK_STATUSES`
3. `frontend/src/components/ui/StatusPill.jsx` → `STYLES` and `LABELS`
4. `backend/src/services/indexerService.js` → the event → status mapping in `handleMarketplaceEvent`
5. `docs/ARCHITECTURE.md` if the change affects the lifecycle diagram

Steps 2–3 used to be four independent, easy-to-forget places; they're now down to one shared source
(`constants.js`) on the backend, but the frontend still needs its own copy since it's a separate bundle —
there's no live import path between the two without introducing a monorepo package boundary, which is a
reasonable next step if this grows past a submission project.
