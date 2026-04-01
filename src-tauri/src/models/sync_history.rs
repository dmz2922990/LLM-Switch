use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncHistory {
    pub id: String,
    pub profile_id: String,
    pub host_id: String,
    pub synced_at: String,
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub profile_id: String,
    pub host_id: String,
    pub success: bool,
    pub error_message: Option<String>,
}
