#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, token, Env, String};
use staking::{StakingContract, StakingContractClient};

struct Harness<'a> {
    market: MarketplaceContractClient<'a>,
    stake: StakingContractClient<'a>,
    token: token::Client<'a>,
    asset: token::StellarAssetClient<'a>,
}

fn setup(env: &Env, fee_bps: u32) -> Harness {
    let admin = Address::generate(env);
    let asset_admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(asset_admin);
    let token_client = token::Client::new(env, &sac.address());
    let asset_client = token::StellarAssetClient::new(env, &sac.address());

    let stake_id = env.register_contract(None, StakingContract);
    let stake_client = StakingContractClient::new(env, &stake_id);
    stake_client.initialize(&admin, &sac.address());

    let market_id = env.register_contract(None, MarketplaceContract);
    let market_client = MarketplaceContractClient::new(env, &market_id);
    market_client.initialize(&admin, &sac.address(), &stake_id, &fee_bps);

    Harness {
        market: market_client,
        stake: stake_client,
        token: token_client,
        asset: asset_client,
    }
}

#[test]
fn full_task_lifecycle_pays_freelancer_and_stakers() {
    let env = Env::default();
    env.mock_all_auths();
    let h = setup(&env, 1_000); // 10% platform fee

    let client = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let staker = Address::generate(&env);
    h.asset.mint(&client, &1_000);
    h.asset.mint(&staker, &1_000);

    // A staker needs skin in the game before the fee lands, otherwise
    // deposit_fee has nowhere to distribute to.
    h.stake.stake(&staker, &500);

    let description = String::from_str(&env, "Build a landing page");
    let task_id = h.market.create_task(&client, &1_000, &description);

    h.market.accept_task(&freelancer, &task_id);

    let deliverable = String::from_str(&env, "ipfs://deliverable-hash");
    h.market.submit_work(&freelancer, &task_id, &deliverable);

    h.market.approve_task(&client, &task_id);

    // 10% of 1000 = 100 fee, freelancer nets 900.
    assert_eq!(h.token.balance(&freelancer), 900);
    assert_eq!(h.stake.earned(&staker), 100);

    let task = h.market.get_task(&task_id);
    assert_eq!(task.status, TaskStatus::Completed);
}

#[test]
fn cancel_refunds_client_when_still_open() {
    let env = Env::default();
    env.mock_all_auths();
    let h = setup(&env, 500);

    let client = Address::generate(&env);
    h.asset.mint(&client, &500);

    let description = String::from_str(&env, "Design a logo");
    let task_id = h.market.create_task(&client, &500, &description);
    h.market.cancel_task(&client, &task_id);

    assert_eq!(h.token.balance(&client), 500);
    let task = h.market.get_task(&task_id);
    assert_eq!(task.status, TaskStatus::Cancelled);
}

#[test]
fn dispute_splits_escrow_by_admin_decision() {
    let env = Env::default();
    env.mock_all_auths();
    let h = setup(&env, 500);

    let client = Address::generate(&env);
    let freelancer = Address::generate(&env);
    h.asset.mint(&client, &1_000);

    let description = String::from_str(&env, "Write API docs");
    let task_id = h.market.create_task(&client, &1_000, &description);
    h.market.accept_task(&freelancer, &task_id);
    h.market.raise_dispute(&client, &task_id);

    // Admin decides freelancer did 60% of the work.
    let admin: Address = env.as_contract(&h.market.address, || {
        env.storage()
            .instance()
            .get(&crate::storage::DataKey::Admin)
            .unwrap()
    });
    h.market.resolve_dispute(&admin, &task_id, &600);

    assert_eq!(h.token.balance(&freelancer), 600);
    assert_eq!(h.token.balance(&client), 400);
}

#[test]
fn only_assigned_freelancer_can_submit_work() {
    let env = Env::default();
    env.mock_all_auths();
    let h = setup(&env, 500);

    let client = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let impostor = Address::generate(&env);
    h.asset.mint(&client, &500);

    let description = String::from_str(&env, "Refactor backend");
    let task_id = h.market.create_task(&client, &500, &description);
    h.market.accept_task(&freelancer, &task_id);

    let deliverable = String::from_str(&env, "done");
    let result = h.market.try_submit_work(&impostor, &task_id, &deliverable);
    assert!(result.is_err());
}

#[test]
fn pause_blocks_new_tasks_but_not_in_flight_ones() {
    let env = Env::default();
    env.mock_all_auths();
    let h = setup(&env, 500);

    let admin: Address = env.as_contract(&h.market.address, || {
        env.storage().instance().get(&crate::storage::DataKey::Admin).unwrap()
    });

    let client = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let staker = Address::generate(&env);
    h.asset.mint(&client, &2_000);
    h.asset.mint(&staker, &1_000);

    // A staker needs skin in the game before the fee lands, otherwise
    // deposit_fee has nowhere to distribute to and approve_task reverts
    // by design (see the comment on approve_task's deposit_fee call).
    h.stake.stake(&staker, &500);

    // Task created before the pause must still be completable afterwards.
    let description = String::from_str(&env, "Pre-pause task");
    let task_id = h.market.create_task(&client, &500, &description);

    h.market.pause(&admin);
    assert!(h.market.is_paused());

    // New escrow is blocked while paused.
    let blocked_description = String::from_str(&env, "Should not be allowed");
    let blocked = h.market.try_create_task(&client, &500, &blocked_description);
    assert!(blocked.is_err());

    // The pre-existing task can still proceed through its full lifecycle.
    h.market.accept_task(&freelancer, &task_id);
    let deliverable = String::from_str(&env, "done despite pause");
    h.market.submit_work(&freelancer, &task_id, &deliverable);
    h.market.approve_task(&client, &task_id);

    let task = h.market.get_task(&task_id);
    assert_eq!(task.status, TaskStatus::Completed);

    h.market.unpause(&admin);
    assert!(!h.market.is_paused());

    let resumed_description = String::from_str(&env, "Allowed again");
    let resumed_id = h.market.create_task(&client, &500, &resumed_description);
    assert!(resumed_id > 0);
}

#[test]
fn non_admin_cannot_pause_or_update_fee() {
    let env = Env::default();
    env.mock_all_auths();
    let h = setup(&env, 500);

    let impostor = Address::generate(&env);

    assert!(h.market.try_pause(&impostor).is_err());
    assert!(h.market.try_update_fee_bps(&impostor, &100).is_err());
}

#[test]
fn fee_update_only_affects_tasks_created_afterwards() {
    let env = Env::default();
    env.mock_all_auths();
    let h = setup(&env, 1_000); // starts at 10%

    let admin: Address = env.as_contract(&h.market.address, || {
        env.storage().instance().get(&crate::storage::DataKey::Admin).unwrap()
    });
    let client = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let staker = Address::generate(&env);

    h.asset.mint(&client, &2_000);
    h.asset.mint(&staker, &1_000);
    h.stake.stake(&staker, &500);

    let old_fee_description = String::from_str(&env, "Created at 10% fee");
    let old_task_id = h.market.create_task(&client, &1_000, &old_fee_description);

    // Fee changes to 5% for anything created from here on.
    h.market.update_fee_bps(&admin, &500);

    let new_fee_description = String::from_str(&env, "Created at 5% fee");
    let new_task_id = h.market.create_task(&client, &1_000, &new_fee_description);

    // The task created before the fee change still resolves at 10%.
    h.market.accept_task(&freelancer, &old_task_id);
    let deliverable = String::from_str(&env, "done");
    h.market.submit_work(&freelancer, &old_task_id, &deliverable);
    h.market.approve_task(&client, &old_task_id);
    assert_eq!(h.token.balance(&freelancer), 900); // 1000 - 10%

    // The task created after the fee change resolves at the new 5% rate.
    h.market.accept_task(&freelancer, &new_task_id);
    h.market.submit_work(&freelancer, &new_task_id, &deliverable);
    h.market.approve_task(&client, &new_task_id);
    assert_eq!(h.token.balance(&freelancer), 900 + 950); // + (1000 - 5%)
}
