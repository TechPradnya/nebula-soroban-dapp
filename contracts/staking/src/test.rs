#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _},
    token, Env,
};

/// Spins up a fresh env, a mock SEP-41 asset (Stellar Asset Contract) to use
/// as the stake/reward token, and the deployed staking contract.
fn setup<'a>(env: &Env) -> (StakingContractClient<'a>, token::Client<'a>, token::StellarAssetClient<'a>, Address) {
    let admin = Address::generate(env);
    let asset_admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(asset_admin.clone());
    let token_client = token::Client::new(env, &sac.address());
    let asset_client = token::StellarAssetClient::new(env, &sac.address());

    let contract_id = env.register_contract(None, StakingContract);
    let client = StakingContractClient::new(env, &contract_id);
    client.initialize(&admin, &sac.address());

    (client, token_client, asset_client, admin)
}

#[test]
fn stake_and_query_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _token, asset, _admin) = setup(&env);

    let staker = Address::generate(&env);
    asset.mint(&staker, &1_000);

    client.stake(&staker, &400);

    assert_eq!(client.staked_balance_of(&staker), 400);
    assert_eq!(client.total_staked(), 400);
}

#[test]
fn fee_deposit_distributes_proportionally() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _token, asset, _admin) = setup(&env);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let marketplace = Address::generate(&env);

    asset.mint(&alice, &1_000);
    asset.mint(&bob, &1_000);
    asset.mint(&marketplace, &1_000);

    // Alice stakes 3x what Bob stakes.
    client.stake(&alice, &300);
    client.stake(&bob, &100);

    // Simulate the Marketplace contract forwarding a 40-token fee: it must
    // hold the tokens in the staking contract's balance before notifying.
    _token.transfer(&marketplace, &client.address, &40);
    client.deposit_fee(&marketplace, &40);

    // Split is proportional to stake: Alice 75% (30), Bob 25% (10).
    assert_eq!(client.earned(&alice), 30);
    assert_eq!(client.earned(&bob), 10);
}

#[test]
fn claim_transfers_rewards_and_resets_accrual() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, token, asset, _admin) = setup(&env);

    let alice = Address::generate(&env);
    let marketplace = Address::generate(&env);
    asset.mint(&alice, &1_000);
    asset.mint(&marketplace, &1_000);

    client.stake(&alice, &500);
    token.transfer(&marketplace, &client.address, &50);
    client.deposit_fee(&marketplace, &50);

    let claimed = client.claim(&alice);
    assert_eq!(claimed, 50);
    assert_eq!(client.earned(&alice), 0);
    assert_eq!(token.balance(&alice), 1_000 - 500 + 50);
}

#[test]
fn unstake_returns_principal_but_keeps_unclaimed_rewards() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, token, asset, _admin) = setup(&env);

    let alice = Address::generate(&env);
    let marketplace = Address::generate(&env);
    asset.mint(&alice, &1_000);
    asset.mint(&marketplace, &1_000);

    client.stake(&alice, &200);
    token.transfer(&marketplace, &client.address, &20);
    client.deposit_fee(&marketplace, &20);

    client.unstake(&alice, &200);

    assert_eq!(client.staked_balance_of(&alice), 0);
    assert_eq!(client.earned(&alice), 20);
    assert_eq!(token.balance(&alice), 1_000);
}

#[test]
fn fee_deposit_with_zero_stakers_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, token, asset, _admin) = setup(&env);

    let marketplace = Address::generate(&env);
    asset.mint(&marketplace, &1_000);
    token.transfer(&marketplace, &client.address, &10);

    let result = client.try_deposit_fee(&marketplace, &10);
    assert!(result.is_err());
}
