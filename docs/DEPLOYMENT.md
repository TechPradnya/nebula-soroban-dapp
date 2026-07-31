# Deployment Guide

This walks through taking Nebula from a local checkout to a live Testnet deployment: contracts first,
then backend, then frontend.

## 0. Prerequisites

- [Soroban CLI](https://developers.stellar.org/docs/tools/developer-tools#soroban-cli) installed and a
  funded Testnet identity (`soroban keys generate nebula-admin --network testnet` then fund via
  [friendbot](https://friendbot.stellar.org))
- Node.js 18+
- A MongoDB instance (Atlas free tier is fine for a submission)
- Accounts on [Vercel](https://vercel.com) and [Railway](https://railway.app) or [Render](https://render.com)

## 1. Deploy the smart contracts

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
cargo test --workspace   # confirm everything passes before deploying

# The native XLM Stellar Asset Contract id on testnet, or your own SEP-41 token:
TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

./scripts/deploy.sh testnet nebula-admin "$TOKEN_ID" 1000
```

The script deploys `staking` first (so its contract id exists), initializes it, deploys `marketplace`,
and initializes it with the staking contract's address wired in. It prints both contract ids at the end —
copy them into `backend/.env`.

**Save for your submission:**
- Both contract addresses (`MARKETPLACE_CONTRACT_ID`, `STAKING_CONTRACT_ID`)
- The transaction hash of the `initialize` call (or any subsequent interaction) as your required
  "transaction hash for contract interaction"

## 2. Deploy the backend (Railway or Render)

1. Push this repo to GitHub.
2. Create a new Railway/Render service pointed at the `backend/` directory (set the root/working directory
   accordingly — both platforms support monorepo subdirectories).
3. Build command: `npm install`. Start command: `npm start`.
4. Set environment variables from `backend/.env.example`, filling in:
   - `MONGO_URI` — your Atlas connection string
   - `JWT_SECRET` — a long random string (`openssl rand -hex 32`)
   - `CLIENT_ORIGIN` — your eventual Vercel URL, e.g. `https://nebula.vercel.app`
   - `MARKETPLACE_CONTRACT_ID`, `STAKING_CONTRACT_ID`, `PLATFORM_TOKEN_CONTRACT_ID` from step 1
5. Deploy. Confirm `GET https://<your-backend>/api/v1/health` returns `{"success":true,"status":"ok"}`.
6. Watch the logs for `Starting event indexer, polling every 5000ms` — that confirms the indexer is live
   and will start mirroring on-chain activity into MongoDB.

## 3. Deploy the frontend (Vercel)

1. Import the repo into Vercel, set the root directory to `frontend/`.
2. Framework preset: Vite.
3. Environment variables:
   - `VITE_API_URL=https://<your-backend>/api/v1`
   - `VITE_WS_URL=wss://<your-backend>/ws`
   - `VITE_STELLAR_NETWORK=TESTNET`
4. Deploy. Vercel will run `npm install && npm run build` automatically.

## 4. Smoke test the live deployment

1. Open the Vercel URL, connect Freighter (switch it to Testnet first).
2. Register an account, link your wallet from the Profile page.
3. Post a task from the Marketplace page — this triggers a real `create_task` transaction; approve it in
   Freighter.
4. From a second wallet/browser profile, accept the task, submit work, then approve it from the first
   wallet. Confirm the freelancer's balance increases and, if you've staked, that your rewards on the
   Wallet page increase too.
5. Check the Activity page for the resulting transaction hashes — these are your submission's required
   "transaction hash for contract interaction" evidence if you didn't save one from step 1.

## 5. CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main` and has three independent jobs — contracts,
backend, frontend — each running install → lint → test → build. Screenshot a green run for your
submission's CI/CD requirement.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `deposit_fee` fails on the first approved task | No one has staked yet — the pool needs at least one staker before it can receive a fee (see `ARCHITECTURE.md`) |
| Indexer logs `Indexer poll failed` repeatedly | `SOROBAN_RPC_URL` unreachable, or contract ids in `.env` are wrong/unset |
| Wallet won't connect | Freighter/Albedo/xBull extension not installed, or set to the wrong network |
| CORS errors in the browser console | `CLIENT_ORIGIN` on the backend doesn't match the frontend's deployed URL |
