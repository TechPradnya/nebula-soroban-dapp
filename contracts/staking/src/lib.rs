//! # Nebula Staking Rewards Contract
//!
//! Freelancers who complete work on the Marketplace contract can stake their
//! earnings back into this contract. Every time the Marketplace settles a
//! task it forwards its platform fee here via `deposit_fee`, which is folded
//! into a running "reward per staked token" accumulator (the same pattern
//! used by Synthetix/Curve fee-distributor contracts). Stakers accrue a
//! share of every fee proportional to how much — and for how long — they
//! have staked, without the contract needing to loop over stakers.
//!
//! This is the "inter-contract communication" counterpart to the
//! Marketplace contract: Marketplace transfers tokens here and then invokes
//! `deposit_fee` in the same transaction so accounting always matches the
//! actual token balance held by this contract.

#![no_std]

mod error;
mod storage;

use error::StakingError;
use soroban_sdk::{contract, contractimpl, token, Address, Env};
use storage::DataKey;

/// Fixed-point precision used for the reward-per-token accumulator so that
/// integer division doesn't erase small per-token reward fractions.
const PRECISION: i128 = 1_000_000_000_000; // 1e12

/// TTL (in ledgers) that instance/persistent storage is bumped by on write.
/// ~30 days assuming 5s ledgers, keeps active contract state from expiring.
const BUMP_AMOUNT: u32 = 518_400;
const BUMP_THRESHOLD: u32 = 259_200;

#[contract]
pub struct StakingContract;

#[contractimpl]
impl StakingContract {
    /// One-time setup. `token` is the SEP-41 asset used both for staking
    /// principal and for the fees the Marketplace deposits.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), StakingError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(StakingError::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::TotalStaked, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::RewardPerTokenStored, &0i128);
        env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);

        Ok(())
    }

    /// Stake `amount` of the reward token. Requires the staker's
    /// authorization; tokens move from the staker's wallet into this
    /// contract via the standard token client, not a manual balance edit.
    pub fn stake(env: Env, staker: Address, amount: i128) -> Result<(), StakingError> {
        staker.require_auth();
        if amount <= 0 {
            return Err(StakingError::InvalidAmount);
        }
        Self::assert_initialized(&env)?;

        Self::update_reward(&env, &staker);

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(&staker, &env.current_contract_address(), &amount);

        let balance = Self::staked_balance(&env, &staker);
        let new_balance = balance + amount;
        env.storage()
            .persistent()
            .set(&DataKey::StakedBalance(staker.clone()), &new_balance);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::StakedBalance(staker.clone()), BUMP_THRESHOLD, BUMP_AMOUNT);

        let total: i128 = env.storage().instance().get(&DataKey::TotalStaked).unwrap();
        env.storage()
            .instance()
            .set(&DataKey::TotalStaked, &(total + amount));

        env.events()
            .publish((symbol_short(&env, "stake"), staker), amount);

        Ok(())
    }

    /// Withdraw previously staked principal. Rewards already accrued are
    /// preserved and can still be claimed afterwards.
    pub fn unstake(env: Env, staker: Address, amount: i128) -> Result<(), StakingError> {
        staker.require_auth();
        if amount <= 0 {
            return Err(StakingError::InvalidAmount);
        }
        Self::assert_initialized(&env)?;

        Self::update_reward(&env, &staker);

        let balance = Self::staked_balance(&env, &staker);
        if balance < amount {
            return Err(StakingError::InsufficientStakedBalance);
        }

        let new_balance = balance - amount;
        env.storage()
            .persistent()
            .set(&DataKey::StakedBalance(staker.clone()), &new_balance);

        let total: i128 = env.storage().instance().get(&DataKey::TotalStaked).unwrap();
        env.storage()
            .instance()
            .set(&DataKey::TotalStaked, &(total - amount));

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(&env.current_contract_address(), &staker, &amount);

        env.events()
            .publish((symbol_short(&env, "unstake"), staker), amount);

        Ok(())
    }

    /// Claim accrued rewards. Callable independently of unstaking so long
    /// term stakers aren't forced to exit their position to get paid.
    pub fn claim(env: Env, staker: Address) -> Result<i128, StakingError> {
        staker.require_auth();
        Self::assert_initialized(&env)?;

        Self::update_reward(&env, &staker);

        let owed: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Rewards(staker.clone()))
            .unwrap_or(0);

        if owed <= 0 {
            return Err(StakingError::NothingToClaim);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Rewards(staker.clone()), &0i128);

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(&env.current_contract_address(), &staker, &owed);

        env.events()
            .publish((symbol_short(&env, "claim"), staker), owed);

        Ok(owed)
    }

    /// Called by the Marketplace contract right after it transfers its
    /// platform fee to this contract's balance. This is the cross-contract
    /// entry point: Marketplace never touches staker balances directly, it
    /// only ever hands off tokens + a notification.
    pub fn deposit_fee(env: Env, from: Address, amount: i128) -> Result<(), StakingError> {
        from.require_auth();
        if amount <= 0 {
            return Err(StakingError::InvalidAmount);
        }
        Self::assert_initialized(&env)?;

        let total: i128 = env.storage().instance().get(&DataKey::TotalStaked).unwrap();
        if total == 0 {
            // No stakers to receive the fee yet — the fee stays as idle
            // contract balance and is folded in once someone stakes and a
            // subsequent deposit_fee call runs against a non-zero total.
            return Err(StakingError::ZeroTotalStaked);
        }

        let reward_per_token: i128 = env
            .storage()
            .instance()
            .get(&DataKey::RewardPerTokenStored)
            .unwrap();
        let increment = (amount * PRECISION) / total;
        env.storage()
            .instance()
            .set(&DataKey::RewardPerTokenStored, &(reward_per_token + increment));

        env.events()
            .publish((symbol_short(&env, "fee"), from), amount);

        Ok(())
    }

    pub fn staked_balance_of(env: Env, staker: Address) -> i128 {
        Self::staked_balance(&env, &staker)
    }

    pub fn earned(env: Env, staker: Address) -> i128 {
        Self::earned_internal(&env, &staker)
    }

    pub fn total_staked(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalStaked)
            .unwrap_or(0)
    }

    // ---------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------

    fn assert_initialized(env: &Env) -> Result<(), StakingError> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(StakingError::NotInitialized);
        }
        Ok(())
    }

    fn staked_balance(env: &Env, staker: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::StakedBalance(staker.clone()))
            .unwrap_or(0)
    }

    fn earned_internal(env: &Env, staker: &Address) -> i128 {
        let balance = Self::staked_balance(env, staker);
        let reward_per_token: i128 = env
            .storage()
            .instance()
            .get(&DataKey::RewardPerTokenStored)
            .unwrap_or(0);
        let paid: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::RewardPerTokenPaid(staker.clone()))
            .unwrap_or(0);
        let accrued: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Rewards(staker.clone()))
            .unwrap_or(0);

        accrued + (balance * (reward_per_token - paid)) / PRECISION
    }

    /// Snapshots a staker's earned rewards against the current global
    /// accumulator before their balance changes. Must run before every
    /// stake/unstake/claim so past rewards aren't diluted or lost.
    fn update_reward(env: &Env, staker: &Address) {
        let earned = Self::earned_internal(env, staker);
        let reward_per_token: i128 = env
            .storage()
            .instance()
            .get(&DataKey::RewardPerTokenStored)
            .unwrap_or(0);

        env.storage()
            .persistent()
            .set(&DataKey::Rewards(staker.clone()), &earned);
        env.storage().persistent().set(
            &DataKey::RewardPerTokenPaid(staker.clone()),
            &reward_per_token,
        );
        env.storage().persistent().extend_ttl(
            &DataKey::Rewards(staker.clone()),
            BUMP_THRESHOLD,
            BUMP_AMOUNT,
        );
    }
}

/// Small helper so event topics read as short symbols without repeating
/// `Symbol::short` boilerplate at every call site.
fn symbol_short(env: &Env, s: &str) -> soroban_sdk::Symbol {
    soroban_sdk::Symbol::short(s)
}

#[cfg(test)]
mod test;
