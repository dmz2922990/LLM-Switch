use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub settings_json: String,
    pub is_active: bool,
    pub sort_order: i64,
    pub sync_keys: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProfile {
    pub name: String,
    pub settings_json: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RenameProfile {
    pub id: String,
    pub new_name: String,
}

#[derive(Debug, Deserialize)]
pub struct CopyProfile {
    pub id: String,
}
