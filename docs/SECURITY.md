# Security

## Reporting a vulnerability

Please don't open a public issue for a security-relevant bug. Instead, email the maintainers directly (or,
if this is a hackathon/bounty submission, follow the organizer's disclosure process) with a description
and reproduction steps. Aim to respond within 48 hours.

## What's already in place

**Contracts**
- Every state-mutating entry point (`create_task`, `accept_task`, `submit_work`, `approve_task`,
  `cancel_task`, `raise_dispute`, `resolve_dispute`, `pause`, `unpause`, `update_fee_bps`, `stake`,
  `unstake`, `claim`, `deposit_fee`) calls `require_auth()` on the relevant party before doing anything —
  the network rejects the transaction outright if that party didn't actually sign it.
- Admin-only actions (`resolve_dispute`, `pause`, `unpause`, `update_fee_bps`) additionally check the
  authorized address against the stored admin address — proving *someone* signed isn't the same as proving
  *the admin* signed.
- `fee_bps` is capped at `MAX_FEE_BPS` (20%) both at initialization and on every later update, so a
  compromised or malicious admin key can't set an extractive fee.
- `fee_bps` is snapshotted onto each `Task` at creation time, so an admin fee change can never retroactively
  alter an escrow that's already in flight.
- `pause`/`unpause` give the admin an emergency stop on *new* escrow (`create_task`) without touching funds
  already committed to in-flight tasks — those still resolve normally through accept/submit/approve/dispute.
- Release builds have `overflow-checks = true` (see `contracts/Cargo.toml`), so integer overflow panics
  instead of silently wrapping.
- The Staking contract's fee-distribution accumulator is atomic with the Marketplace's fee transfer — see
  `docs/ARCHITECTURE.md` — so accounting can never drift from the actual token balance held.

**Backend**
- Passwords hashed with bcrypt (cost factor 12), never stored or logged in plaintext; `User.toJSON` strips
  `passwordHash` from every API response regardless of which query populated it.
- JWTs are short-lived (`JWT_EXPIRES_IN`, default 7 days) and verified against a live user lookup on every
  authenticated request — a deleted/deactivated user's existing token stops working immediately rather than
  remaining valid until expiry.
- `express-mongo-sanitize` strips `$`/`.` from request keys before they reach any Mongoose query, closing
  off NoSQL operator injection (e.g. `{"email": {"$ne": null}}`).
- `hpp` collapses duplicate query-string keys so a handler can't be tricked by `?status=open&status=$ne`.
- Helmet is configured with an explicit, restrictive CSP (the API serves only JSON, so `script-src`,
  `style-src`, and `img-src` are all `'none'`) rather than left on defaults.
- `app.set('trust proxy', 1)` — without this, IP-based rate limiting is meaningless behind Railway/Render's
  reverse proxy (every request appears to come from the proxy's IP).
- Every write to the blockchain is built server-side but *signed client-side* — the backend never holds,
  transmits, or has access to a private key. See `services/stellarService.js`.
- `POST /transactions/build` validates `method` against an explicit allowlist of known contract entry
  points, rather than accepting an arbitrary method name — reduces the backend's usefulness as a blind
  transaction-building oracle even though on-chain auth would still reject an unauthorized signer.
- Rate limiting: a global limiter on `/api/v1/*`, and a tighter one specifically on `/auth/*` to slow down
  credential stuffing.
- All Joi validation schemas `stripUnknown`, so unexpected fields in a request body are silently dropped
  rather than passed through to a query or a model.

## Known follow-ups (not yet implemented — flagged rather than hidden)

- **No refresh-token rotation.** A stolen JWT is valid until it expires. A production hardening pass would
  add short-lived access tokens plus rotating refresh tokens with revocation.
- **No token revocation list.** Changing a password or an account role doesn't invalidate JWTs issued
  before the change; they remain valid until natural expiry.
- **No CAPTCHA/bot mitigation** on `/auth/register`, beyond the rate limiter.
- **No contract upgrade path.** Soroban contracts are immutable once deployed unless built with an
  explicit upgrade hook; this codebase does not include one. A "v2" contract would need its own
  deployment, and the backend/frontend would need to point at the new contract id. `pause()` exists
  specifically to buy time to do that safely if a critical issue is found.
- **No formal contract audit.** These contracts have not been reviewed by a third-party Soroban security
  auditor. Do not deploy this to mainnet with real funds without one.
