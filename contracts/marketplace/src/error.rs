use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum MarketplaceError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InvalidFee = 4,
    TaskNotFound = 5,
    NotTaskOwner = 6,
    NotAssignedFreelancer = 7,
    InvalidStatusForAction = 8,
    Unauthorized = 9,
    ContractPaused = 10,
}
