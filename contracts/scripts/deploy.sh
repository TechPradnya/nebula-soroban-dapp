#!/usr/bin/env bash
# Deploys the Staking and Marketplace contracts to a Soroban network in the
# correct order (Staking first, since Marketplace needs its address) and
# wires them together. Requires the Soroban CLI and a funded identity.
#
# Usage:
#   ./deploy.sh <network: testnet|futurenet|mainnet> <identity-name> <fee-token-contract-id> <fee-bps>
#
# Example:
#   ./deploy.sh testnet nebula-admin CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC 1000

set -euo pipefail

NETWORK="${1:?Usage: deploy.sh <network> <identity> <token-contract-id> <fee-bps>}"
IDENTITY="${2:?Missing identity name}"
TOKEN_ID="${3:?Missing fee/stake token contract id (e.g. the native XLM SAC)}"
FEE_BPS="${4:-1000}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_ADDRESS=$(soroban keys address "$IDENTITY")

echo "==> Network:        $NETWORK"
echo "==> Admin identity:  $IDENTITY ($ADMIN_ADDRESS)"
echo "==> Fee/stake token: $TOKEN_ID"
echo "==> Fee (bps):       $FEE_BPS"
echo

echo "==> Building contracts..."
(cd "$ROOT_DIR" && cargo build --target wasm32-unknown-unknown --release)

WASM_DIR="$ROOT_DIR/target/wasm32-unknown-unknown/release"

echo "==> Deploying Staking contract..."
STAKING_ID=$(soroban contract deploy \
  --wasm "$WASM_DIR/staking.wasm" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "    Staking contract id: $STAKING_ID"

echo "==> Initializing Staking contract..."
soroban contract invoke \
  --id "$STAKING_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --token "$TOKEN_ID"

echo "==> Deploying Marketplace contract..."
MARKETPLACE_ID=$(soroban contract deploy \
  --wasm "$WASM_DIR/marketplace.wasm" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "    Marketplace contract id: $MARKETPLACE_ID"

echo "==> Initializing Marketplace contract (linked to Staking)..."
soroban contract invoke \
  --id "$MARKETPLACE_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --token "$TOKEN_ID" \
  --staking_contract "$STAKING_ID" \
  --fee_bps "$FEE_BPS"

echo
echo "==> Deployment complete. Add these to backend/.env:"
echo "MARKETPLACE_CONTRACT_ID=$MARKETPLACE_ID"
echo "STAKING_CONTRACT_ID=$STAKING_ID"
echo "PLATFORM_TOKEN_CONTRACT_ID=$TOKEN_ID"
