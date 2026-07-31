use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TaskStatus {
    /// Posted by a client, funds escrowed, no freelancer assigned yet.
    Open,
    /// A freelancer has claimed the task and is working on it.
    InProgress,
    /// Freelancer marked their deliverable as ready for review.
    Submitted,
    /// Client approved the work; funds released, fee forwarded to staking.
    Completed,
    /// Client cancelled while the task was still unclaimed.
    Cancelled,
    /// Either party escalated for admin arbitration.
    Disputed,
    /// Admin arbitrated a dispute and funds have been split/released.
    Resolved,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Task {
    pub client: Address,
    pub freelancer: Option<Address>,
    pub amount: i128,
    /// Fee in basis points, snapshotted at creation time so a later admin
    /// fee change never retroactively affects tasks already in flight.
    pub fee_bps: u32,
    pub description: String,
    pub deliverable: Option<String>,
    pub status: TaskStatus,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    StakingContract,
    FeeBps,
    NextTaskId,
    Task(u64),
    Paused,
}
