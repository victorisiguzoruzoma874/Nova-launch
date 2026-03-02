#![allow(dead_code)]

use soroban_sdk::{contracterror, contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FactoryState {
    pub admin: Address,
    pub treasury: Address,
    pub base_fee: i128,
    pub metadata_fee: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenInfo {
    pub address: Address,
    pub creator: Address,
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub total_supply: i128,
    pub metadata_uri: Option<String>,
    pub created_at: u64,
    pub is_paused: bool,
}

/// Compact read-only snapshot of a token's current state.
/// Returned by get_token_stats().
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenStats {
    pub current_supply: i128,  // live circulating supply
    pub total_burned:   i128,  // cumulative amount burned since creation
    pub burn_count:     u32,   // number of burn operations performed
    pub is_paused:      bool,  // token-level pause flag
    pub has_clawback:   bool,  // clawback policy flag (reserved; always false for now)
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Treasury,
    BaseFee,
    MetadataFee,
    TokenCount,
    Token(u32),
    Balance(u32, Address),
    BurnCount(u32),
    TokenPaused(u32),
    TotalBurned(u32),   // NEW — cumulative burned amount per token
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Error {
    InsufficientFee     = 1,
    Unauthorized        = 2,
    InvalidParameters   = 3,
    TokenNotFound       = 4,
    MetadataAlreadySet  = 5,
    AlreadyInitialized  = 6,
    InsufficientBalance = 7,
    ArithmeticError     = 8,
    BatchTooLarge       = 9,
    TokenPaused         = 10,
}

