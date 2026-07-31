//! # Nebula Task Marketplace Contract
//!
//! Clients escrow payment for freelance tasks; freelancers claim, deliver,
//! and get paid once the client approves. On approval, the platform fee is
//! peeled off and forwarded straight into the Staking contract via a typed
//! cross-contract call (`staking::StakingContractClient`), which folds it
//! into every staker's rewards in the same transaction. This contract never
//! reaches into staker balances directly — it only ever moves tokens plus a
//! notification, keeping the two contracts loosely coupled but consistent.
//! The client type comes from the lightweight `staking-interface` crate
//! (not the `staking` implementation crate) so this contract's WASM never
//! links in a second copy of Staking's own exported entry points.

#![no_std]

mod error;
mod storage;

use error::MarketplaceError;
use soroban_sdk::{contract, contractimpl, token, Address, Env, String, Symbol};
use staking_interface::StakingContractClient;
use storage::{DataKey, Task, TaskStatus};

const BUMP_AMOUNT: u32 = 518_400;
const BUMP_THRESHOLD: u32 = 259_200;
const MAX_FEE_BPS: u32 = 2_000; // Hard cap: platform fee can never exceed 20%.

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        staking_contract: Address,
        fee_bps: u32,
    ) -> Result<(), MarketplaceError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(MarketplaceError::AlreadyInitialized);
        }
        if fee_bps > MAX_FEE_BPS {
            return Err(MarketplaceError::InvalidFee);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage()
            .instance()
            .set(&DataKey::StakingContract, &staking_contract);
        env.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        env.storage().instance().set(&DataKey::NextTaskId, &1u64);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);

        Ok(())
    }

    /// Client posts a task and escrows `amount` of the platform token.
    /// Returns the new task id.
    pub fn create_task(
        env: Env,
        client: Address,
        amount: i128,
        description: String,
    ) -> Result<u64, MarketplaceError> {
        client.require_auth();
        if amount <= 0 {
            return Err(MarketplaceError::InvalidAmount);
        }
        Self::assert_initialized(&env)?;
        Self::assert_not_paused(&env)?;

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(&client, &env.current_contract_address(), &amount);

        let fee_bps: u32 = env.storage().instance().get(&DataKey::FeeBps).unwrap();
        let task_id: u64 = env.storage().instance().get(&DataKey::NextTaskId).unwrap();

        let task = Task {
            client: client.clone(),
            freelancer: None,
            amount,
            fee_bps,
            description,
            deliverable: None,
            status: TaskStatus::Open,
            created_at: env.ledger().timestamp(),
        };
        Self::save_task(&env, task_id, &task);
        env.storage()
            .instance()
            .set(&DataKey::NextTaskId, &(task_id + 1));

        env.events()
            .publish((Symbol::new(&env, "task_created"), client), (task_id, amount));

        Ok(task_id)
    }

    /// Freelancer claims an open task.
    pub fn accept_task(env: Env, freelancer: Address, task_id: u64) -> Result<(), MarketplaceError> {
        freelancer.require_auth();
        let mut task = Self::load_task(&env, task_id)?;
        if task.status != TaskStatus::Open {
            return Err(MarketplaceError::InvalidStatusForAction);
        }

        task.freelancer = Some(freelancer.clone());
        task.status = TaskStatus::InProgress;
        Self::save_task(&env, task_id, &task);

        env.events()
            .publish((Symbol::new(&env, "task_accepted"), freelancer), task_id);
        Ok(())
    }

    /// Freelancer marks their deliverable as ready for client review.
    pub fn submit_work(
        env: Env,
        freelancer: Address,
        task_id: u64,
        deliverable: String,
    ) -> Result<(), MarketplaceError> {
        freelancer.require_auth();
        let mut task = Self::load_task(&env, task_id)?;
        if task.status != TaskStatus::InProgress {
            return Err(MarketplaceError::InvalidStatusForAction);
        }
        if task.freelancer.as_ref() != Some(&freelancer) {
            return Err(MarketplaceError::NotAssignedFreelancer);
        }

        task.deliverable = Some(deliverable);
        task.status = TaskStatus::Submitted;
        Self::save_task(&env, task_id, &task);

        env.events()
            .publish((Symbol::new(&env, "work_submitted"), freelancer), task_id);
        Ok(())
    }

    /// Client approves the submitted work. Releases `amount - fee` to the
    /// freelancer, then transfers the fee to the Staking contract and
    /// invokes `deposit_fee` on it so it's folded into staker rewards —
    /// the cross-contract call at the heart of this system.
    pub fn approve_task(env: Env, client: Address, task_id: u64) -> Result<(), MarketplaceError> {
        client.require_auth();
        let mut task = Self::load_task(&env, task_id)?;
        if task.client != client {
            return Err(MarketplaceError::NotTaskOwner);
        }
        if task.status != TaskStatus::Submitted {
            return Err(MarketplaceError::InvalidStatusForAction);
        }

        let freelancer = task.freelancer.clone().ok_or(MarketplaceError::NotAssignedFreelancer)?;
        let fee = (task.amount * task.fee_bps as i128) / 10_000;
        let payout = task.amount - fee;

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        let this_contract = env.current_contract_address();

        token_client.transfer(&this_contract, &freelancer, &payout);

        if fee > 0 {
            let staking_id: Address = env.storage().instance().get(&DataKey::StakingContract).unwrap();
            token_client.transfer(&this_contract, &staking_id, &fee);

            // Typed cross-contract call into the staking module. If the
            // staking pool has zero stakers this call fails; that's
            // intentional so payout logic stays atomic with fee accounting
            // and the transaction rolls back cleanly rather than silently
            // burning the fee.
            let staking_client = StakingContractClient::new(&env, &staking_id);
            staking_client.deposit_fee(&this_contract, &fee);
        }

        task.status = TaskStatus::Completed;
        Self::save_task(&env, task_id, &task);

        env.events().publish(
            (Symbol::new(&env, "task_completed"), client),
            (task_id, payout, fee),
        );
        Ok(())
    }

    /// Client cancels a task that no freelancer has claimed yet; full
    /// refund, no fee taken.
    pub fn cancel_task(env: Env, client: Address, task_id: u64) -> Result<(), MarketplaceError> {
        client.require_auth();
        let mut task = Self::load_task(&env, task_id)?;
        if task.client != client {
            return Err(MarketplaceError::NotTaskOwner);
        }
        if task.status != TaskStatus::Open {
            return Err(MarketplaceError::InvalidStatusForAction);
        }

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(&env.current_contract_address(), &client, &task.amount);

        task.status = TaskStatus::Cancelled;
        Self::save_task(&env, task_id, &task);

        env.events()
            .publish((Symbol::new(&env, "task_cancelled"), client), task_id);
        Ok(())
    }

    /// Either party escalates an in-flight task for admin arbitration.
    pub fn raise_dispute(env: Env, caller: Address, task_id: u64) -> Result<(), MarketplaceError> {
        caller.require_auth();
        let mut task = Self::load_task(&env, task_id)?;
        let is_party = task.client == caller || task.freelancer.as_ref() == Some(&caller);
        if !is_party {
            return Err(MarketplaceError::Unauthorized);
        }
        if !matches!(task.status, TaskStatus::InProgress | TaskStatus::Submitted) {
            return Err(MarketplaceError::InvalidStatusForAction);
        }

        task.status = TaskStatus::Disputed;
        Self::save_task(&env, task_id, &task);

        env.events()
            .publish((Symbol::new(&env, "task_disputed"), caller), task_id);
        Ok(())
    }

    /// Admin arbitrates a dispute, splitting escrow between freelancer and
    /// client refund. `freelancer_amount` must not exceed the task amount;
    /// the remainder is refunded to the client. No platform fee is taken on
    /// disputed resolutions.
    pub fn resolve_dispute(
        env: Env,
        admin: Address,
        task_id: u64,
        freelancer_amount: i128,
    ) -> Result<(), MarketplaceError> {
        Self::require_admin(&env, &admin)?;

        let mut task = Self::load_task(&env, task_id)?;
        if task.status != TaskStatus::Disputed {
            return Err(MarketplaceError::InvalidStatusForAction);
        }
        if freelancer_amount < 0 || freelancer_amount > task.amount {
            return Err(MarketplaceError::InvalidAmount);
        }

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        let this_contract = env.current_contract_address();
        let client_refund = task.amount - freelancer_amount;

        if freelancer_amount > 0 {
            if let Some(freelancer) = &task.freelancer {
                token_client.transfer(&this_contract, freelancer, &freelancer_amount);
            }
        }
        if client_refund > 0 {
            token_client.transfer(&this_contract, &task.client, &client_refund);
        }

        task.status = TaskStatus::Resolved;
        Self::save_task(&env, task_id, &task);

        env.events().publish(
            (Symbol::new(&env, "dispute_resolved"), admin),
            (task_id, freelancer_amount, client_refund),
        );
        Ok(())
    }

    pub fn get_task(env: Env, task_id: u64) -> Result<Task, MarketplaceError> {
        Self::load_task(&env, task_id)
    }

    /// Emergency stop: blocks new escrow via `create_task` while leaving
    /// every task already in flight free to progress through accept,
    /// submit, approve, cancel, and dispute resolution normally. This
    /// exists so an incident (e.g. a bug found in a downstream integration)
    /// can be contained without freezing funds that are already committed.
    pub fn pause(env: Env, admin: Address) -> Result<(), MarketplaceError> {
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::Paused, &true);
        env.events().publish((Symbol::new(&env, "paused"), admin), ());
        Ok(())
    }

    pub fn unpause(env: Env, admin: Address) -> Result<(), MarketplaceError> {
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::Paused, &false);
        env.events().publish((Symbol::new(&env, "unpaused"), admin), ());
        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    /// Admin-adjustable platform fee, capped at `MAX_FEE_BPS`. Existing
    /// tasks are unaffected — `fee_bps` is snapshotted onto each `Task` at
    /// creation time specifically so a later fee change can never
    /// retroactively alter an escrow already in flight.
    pub fn update_fee_bps(env: Env, admin: Address, new_fee_bps: u32) -> Result<(), MarketplaceError> {
        Self::require_admin(&env, &admin)?;
        if new_fee_bps > MAX_FEE_BPS {
            return Err(MarketplaceError::InvalidFee);
        }
        env.storage().instance().set(&DataKey::FeeBps, &new_fee_bps);
        env.events()
            .publish((Symbol::new(&env, "fee_updated"), admin), new_fee_bps);
        Ok(())
    }

    // ---------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------

    fn assert_initialized(env: &Env) -> Result<(), MarketplaceError> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(MarketplaceError::NotInitialized);
        }
        Ok(())
    }

    fn assert_not_paused(env: &Env) -> Result<(), MarketplaceError> {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            return Err(MarketplaceError::ContractPaused);
        }
        Ok(())
    }

    /// Requires both a valid signature from `admin` *and* that the address
    /// matches the stored admin — `require_auth` alone only proves the
    /// caller controls whatever address they passed in, not that it's the
    /// right one.
    fn require_admin(env: &Env, admin: &Address) -> Result<(), MarketplaceError> {
        admin.require_auth();
        Self::assert_initialized(env)?;
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if *admin != stored_admin {
            return Err(MarketplaceError::Unauthorized);
        }
        Ok(())
    }

    fn load_task(env: &Env, task_id: u64) -> Result<Task, MarketplaceError> {
        env.storage()
            .persistent()
            .get(&DataKey::Task(task_id))
            .ok_or(MarketplaceError::TaskNotFound)
    }

    fn save_task(env: &Env, task_id: u64, task: &Task) {
        env.storage().persistent().set(&DataKey::Task(task_id), task);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Task(task_id), BUMP_THRESHOLD, BUMP_AMOUNT);
    }
}

#[cfg(test)]
mod test;
