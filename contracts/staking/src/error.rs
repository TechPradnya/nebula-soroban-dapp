use soroban_sdk::contracterror;

/// Domain errors for the Staking Rewards contract.
///
/// Soroban surfaces these as `Error(Contract, #code)` to callers, which lets
/// the backend indexer and frontend map failures to actionable messages
/// instead of parsing opaque panics.
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
