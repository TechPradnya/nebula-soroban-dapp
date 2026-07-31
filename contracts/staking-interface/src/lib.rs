//! # Staking Contract Interface
//!
//! This crate exists purely so that other contracts (e.g. Marketplace) can
//! get a typed `StakingContractClient` for cross-contract calls *without*
//! depending on the `staking` implementation crate directly.
//!
//! Why this matters: the `staking` crate's `[lib] crate-type` includes
//! `cdylib` and its `#[contractimpl]` block emits real WASM export
//! functions (e.g. `initialize`). If another contract crate depends on
//! `staking` as a normal path dependency, cargo links that whole rlib
//! -- exports and all -- into the dependent's own `.wasm`. Two contracts
//! both exporting `initialize` in one binary is a linker error
//! ("symbol multiply defined!"). Depending on this interface crate instead
//! avoids that entirely: `#[contractclient]` on a bare trait only ever
//! generates a *caller* (an `Env` + contract-address wrapper that invokes
//! the function by name), never an export.
#![no_std]

use soroban_sdk::{contractclient, contracterror, Address, Env};

/// Mirrors `staking::error::StakingError` code-for-code so that a failed
/// cross-contract call can be pattern-matched by callers without pulling
/// in the full staking implementation crate. Keep the discriminants in
/// sync with `staking/src/error.rs` if that enum ever changes.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum StakingError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InsufficientStakedBalance = 4,
    NothingToClaim = 5,
    ZeroTotalStaked = 6,
    Unauthorized = 7,
}

/// The subset of the Staking contract's public interface that other
/// contracts are allowed to call cross-contract. Add more method
/// signatures here (matching `staking`'s public fns exactly) if other
/// contracts need to call them later.
#[contractclient(name = "StakingContractClient")]
pub trait StakingTrait {
    fn deposit_fee(env: Env, from: Address, amount: i128) -> Result<(), StakingError>;
}
