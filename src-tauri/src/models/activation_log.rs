use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ActivationLog {
    pub id: String,
    pub profile_id: String,
    pub activated_at: String,
    pub status: String,
    pub error_message: Option<String>,
    pub http_status: Option<i64>,
}
