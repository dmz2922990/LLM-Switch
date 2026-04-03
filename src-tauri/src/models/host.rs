use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Host {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: i32,
    pub username: String,
    pub auth_type: String,
    pub encrypted_password: Option<String>,
    pub key_path: Option<String>,
    pub remote_path: String,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateHost {
    pub name: String,
    pub address: String,
    pub port: Option<i32>,
    pub username: String,
    pub auth_type: Option<String>,
    pub password: Option<String>,
    pub key_path: Option<String>,
    pub remote_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateHost {
    pub id: String,
    pub name: Option<String>,
    pub address: Option<String>,
    pub port: Option<i32>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub key_path: Option<String>,
    pub remote_path: Option<String>,
}
