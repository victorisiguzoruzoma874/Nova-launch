use soroban_sdk::{contracttype, Address, String};
use crate::types::Error;

/// Stream information with optional metadata
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StreamInfo {
    pub id: u32,
    pub creator: Address,
    pub recipient: Address,
    pub amount: i128,
    pub metadata: Option<String>,
    pub created_at: u64,
}

/// Metadata update request - only metadata can be changed
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MetadataUpdate {
    pub stream_id: u32,
    pub new_metadata: Option<String>,
}

/// Validate stream metadata length (max 512 chars)
/// 
/// # Validation Rules
/// - None value: Always valid (metadata is optional)
/// - Empty string: Invalid (returns Error::InvalidParameters)
/// - 1-512 characters: Valid
/// - >512 characters: Invalid (returns Error::InvalidParameters)
pub fn validate_metadata(metadata: &Option<String>) -> Result<(), Error> {
    if let Some(meta) = metadata {
        let len = meta.len();
        if len == 0 || len > 512 {
            return Err(Error::InvalidParameters);
        }
    }
    Ok(())
}

/// Validate that financial terms remain immutable
/// 
/// This function ensures that critical financial parameters cannot be modified
/// after stream creation. It's used to enforce the invariant that amount and
/// schedule are locked once a stream is created.
/// 
/// # Parameters
/// - `original`: The original stream info at creation time
/// - `updated`: The proposed updated stream info
/// 
/// # Returns
/// - Ok(()) if financial terms are unchanged
/// - Err(Error::InvalidParameters) if any financial term differs
pub fn validate_financial_invariants(
    original: &StreamInfo,
    updated: &StreamInfo,
) -> Result<(), Error> {
    // Verify immutable financial terms
    if original.amount != updated.amount {
        return Err(Error::InvalidParameters);
    }
    
    if original.creator != updated.creator {
        return Err(Error::InvalidParameters);
    }
    
    if original.recipient != updated.recipient {
        return Err(Error::InvalidParameters);
    }
    
    if original.created_at != updated.created_at {
        return Err(Error::InvalidParameters);
    }
    
    if original.id != updated.id {
        return Err(Error::InvalidParameters);
    }
    
    Ok(())
}
