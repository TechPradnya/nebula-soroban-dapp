use soroban_sdk::{contracttype, Address};

/// Storage layout for the staking contract.
///
/// Admin/Token/TotalStaked/RewardPerTokenStored live in *instance* storage
/// since they're read on almost every call and are small/fixed in number.
/// Per-staker data lives in *persistent* storage keyed by address so it
/// scales to any number of stakers without bloating the instance footprint.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    TotalStaked,
    RewardPerTokenStored,
    StakedBalance(Address),
    RewardPerTokenPaid(Address),
    Rewards(Address),
}
