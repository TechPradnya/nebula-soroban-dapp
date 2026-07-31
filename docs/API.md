# API Reference

Base URL: `/api/v1`. All responses are JSON with the shape `{ success, data?, message?, details?, pagination? }`.
Authenticated endpoints require `Authorization: Bearer <jwt>`.

## Auth

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | — | `displayName, email, password, role?` | Rate-limited. Returns `{ user, token }`. |
| POST | `/auth/login` | — | `email, password` | Rate-limited. Returns `{ user, token }`. |
| GET | `/auth/me` | required | — | Current user profile. |
| PATCH | `/auth/wallet` | required | `walletAddress` | Links a Stellar address to the account. |

## Tasks (off-chain mirror)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/tasks` | — | Query: `status, category, search, page, limit`. |
| GET | `/tasks/mine` | required | Requires a linked wallet. Returns tasks where the user is client or freelancer. |
| GET | `/tasks/:id` | — | `:id` is the on-chain task id (integer). |
| POST | `/tasks` | required | Called after a `create_task` transaction confirms — persists off-chain metadata against the real on-chain id decoded from the transaction's return value. |

## Transactions (on-chain writes)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/transactions/build` | required | `{ contract, method, args, argTypes, sourceAddress }` returns an unsigned, simulated XDR. `method` is validated against an allowlist of known contract entry points. |
| POST | `/transactions/submit` | required | `{ signedXdr }` submits and polls until settled; returns `{ hash, ledger, returnValue }`. |

The three-hop write flow (build, sign client-side, submit) is documented in `docs/ARCHITECTURE.md`.

## Wallets / staking

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/wallets/:address/staking` | — | `{ staked, earned, totalStaked }`, all in stroops, read live from the Staking contract. |
| GET | `/wallets/:address/transactions` | — | Paginated indexed transaction history for an address. |

## Notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | required | Most recent 50 for the current user. |
| PATCH | `/notifications/:id/read` | required | Marks one as read. |
| PATCH | `/notifications/read-all` | required | Marks all as read. |

## Stats

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/stats/overview` | — | Status/category breakdown + 30-day completed-task volume. Cached 15s server-side. |
| GET | `/stats/activity` | — | Most recent 25 indexed transactions across the whole platform. |

## Real-time (WebSocket)

Connect to `wss://<host>/ws`. Subscribe to a channel:

```json
{ "type": "subscribe", "channel": "marketplace:event" }
```

Channels currently emitted by the indexer:
- `marketplace:event` - any Marketplace contract event (task lifecycle transitions)
- `staking:fee_deposited` - a fee was just distributed to the staking pool
- `<userId>` - per-user channel, used for notification delivery

## Error shape

```json
{
  "success": false,
  "message": "Validation failed",
  "details": ["title must be at least 5 characters"],
  "requestId": "f5f4e710-e811-43d3-b2a9-4aba88709b34"
}
```

`requestId` matches the `X-Request-Id` response header and the corresponding server log line - include it
when reporting a bug against a live deployment.
