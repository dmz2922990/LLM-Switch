use crate::models::sync_history::SyncResult;
use crate::services::{host_service, profile_service, sync_history_service};
use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use ssh2::Session;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;

struct UploadResult {
    source_hash: Option<String>,
    target_hash: String,
}

fn compute_short_hash(data: &[u8]) -> String {
    let hash = Sha256::digest(data);
    hash[..6].iter().map(|b| format!("{:02x}", b)).collect()
}

fn merge_json(local: &str, remote_existing: Option<&[u8]>, sync_keys: &[String]) -> String {
    if sync_keys.iter().any(|k| k == "*") {
        return local.to_string();
    }

    let local_obj: Value =
        serde_json::from_str(local).unwrap_or_else(|_| Value::Object(Default::default()));
    let remote_obj: Value = match remote_existing {
        Some(data) => serde_json::from_slice(data).unwrap_or_else(|_| Value::Object(Default::default())),
        None => Value::Object(Default::default()),
    };

    let mut merged = remote_obj;
    if let (Value::Object(ref mut m), Value::Object(ref l)) = (&mut merged, &local_obj) {
        for key in sync_keys {
            if let Some(val) = l.get(key) {
                m.insert(key.clone(), val.clone());
            }
        }
    }

    serde_json::to_string_pretty(&merged).unwrap_or_else(|_| local.to_string())
}

pub async fn sync_to_host(
    pool: &SqlitePool,
    profile_id: &str,
    host_id: &str,
    sync_keys: &[String],
) -> SyncResult {
    let profile = match profile_service::get_by_id(pool, profile_id).await {
        Ok(p) => p,
        Err(e) => {
            return SyncResult {
                profile_id: profile_id.to_string(),
                host_id: host_id.to_string(),
                success: false,
                error_message: Some(e),
            }
        }
    };
    let host = match host_service::get_by_id(pool, host_id).await {
        Ok(h) => h,
        Err(e) => {
            return SyncResult {
                profile_id: profile_id.to_string(),
                host_id: host_id.to_string(),
                success: false,
                error_message: Some(e),
            }
        }
    };
    let password = match host_service::get_password(pool, host_id).await {
        Ok(p) => p,
        Err(e) => {
            return SyncResult {
                profile_id: profile_id.to_string(),
                host_id: host_id.to_string(),
                success: false,
                error_message: Some(e),
            }
        }
    };
    match do_scp_upload(
        &host.address,
        host.port,
        &host.username,
        password.as_deref(),
        host.key_path.as_deref(),
        &host.remote_path,
        &profile.settings_json,
        sync_keys,
    ) {
        Ok(upload) => {
            let _ = sync_history_service::record(
                pool,
                profile_id,
                host_id,
                "success",
                None,
                upload.source_hash.as_deref(),
                Some(&upload.target_hash),
            )
            .await;
            SyncResult {
                profile_id: profile_id.to_string(),
                host_id: host_id.to_string(),
                success: true,
                error_message: None,
            }
        }
        Err(e) => {
            let err_msg = e.clone();
            let _ = sync_history_service::record(
                pool,
                profile_id,
                host_id,
                "failed",
                Some(&err_msg),
                None,
                None,
            )
            .await;
            SyncResult {
                profile_id: profile_id.to_string(),
                host_id: host_id.to_string(),
                success: false,
                error_message: Some(e),
            }
        }
    }
}

pub async fn sync_to_hosts(
    pool: &SqlitePool,
    profile_id: &str,
    host_ids: &[String],
    sync_keys: &[String],
) -> Vec<SyncResult> {
    let mut results = Vec::new();
    for host_id in host_ids {
        let result = sync_to_host(pool, profile_id, host_id, sync_keys).await;
        results.push(result);
    }
    results
}

fn do_scp_upload(
    address: &str,
    port: i32,
    username: &str,
    password: Option<&str>,
    key_path: Option<&str>,
    remote_path: &str,
    local_content: &str,
    sync_keys: &[String],
) -> Result<UploadResult, String> {
    let addr = format!("{}:{}", address, port);
    let tcp =
        TcpStream::connect(&addr).map_err(|e| format!("Connection failed ({}): {}", addr, e))?;
    let mut session = Session::new().map_err(|e| format!("SSH session error: {}", e))?;
    session.set_tcp_stream(tcp);
    session
        .handshake()
        .map_err(|e| format!("SSH handshake failed: {}", e))?;
    authenticate(&mut session, username, password, key_path)?;
    let remote = expand_remote_path(&session, remote_path)?;

    let remote_data = read_remote_file(&session, &remote).ok();
    let source_hash = remote_data.as_ref().map(|d| compute_short_hash(d));
    let content = merge_json(local_content, remote_data.as_deref(), sync_keys);
    let target_hash = compute_short_hash(content.as_bytes());

    upload_content(&session, &remote, &content)?;
    session.disconnect(None, "Done", None).ok();
    Ok(UploadResult {
        source_hash,
        target_hash,
    })
}

fn authenticate(
    session: &mut Session,
    username: &str,
    password: Option<&str>,
    key_path: Option<&str>,
) -> Result<(), String> {
    if let Some(kp) = key_path {
        session
            .userauth_pubkey_file(username, None, Path::new(kp), None)
            .map_err(|e| format!("Key auth failed: {}", e))
    } else if let Some(pwd) = password {
        session
            .userauth_password(username, pwd)
            .map_err(|e| format!("Password auth failed: {}", e))
    } else {
        Err("No authentication method provided".to_string())
    }
}

fn expand_remote_path(session: &Session, path: &str) -> Result<String, String> {
    if path.starts_with('~') {
        let mut channel = session
            .channel_session()
            .map_err(|e| format!("Failed to open channel: {}", e))?;
        channel
            .exec("echo -n $HOME")
            .map_err(|e| format!("Failed to exec: {}", e))?;
        let mut home = String::new();
        channel.read_to_string(&mut home).ok();
        channel.wait_close().ok();
        Ok(path.replacen('~', &home, 1))
    } else {
        Ok(path.to_string())
    }
}

fn read_remote_file(session: &Session, remote_path: &str) -> Result<Vec<u8>, String> {
    let sftp = session
        .sftp()
        .map_err(|e| format!("SFTP init failed: {}", e))?;
    let path = Path::new(remote_path);
    let mut file = sftp.open(path).map_err(|_| "File not found".to_string())?;
    let mut data = Vec::new();
    file.read_to_end(&mut data)
        .map_err(|e| format!("Failed to read remote file: {}", e))?;
    Ok(data)
}

fn upload_content(session: &Session, remote_path: &str, content: &str) -> Result<(), String> {
    let sftp = session
        .sftp()
        .map_err(|e| format!("SFTP init failed: {}", e))?;
    let path = Path::new(remote_path);
    if let Some(parent) = path.parent() {
        let _ = sftp.mkdir(parent, 0o755);
    }
    let mut file = sftp
        .create(path)
        .map_err(|e| format!("Failed to create remote file: {}", e))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write content: {}", e))?;
    file.close().map_err(|e| format!("Close error: {}", e))?;
    Ok(())
}

pub fn test_connection(
    address: &str,
    port: i32,
    username: &str,
    password: Option<&str>,
    key_path: Option<&str>,
) -> Result<(), String> {
    let addr = format!("{}:{}", address, port);
    let tcp = TcpStream::connect_timeout(
        &addr
            .parse()
            .map_err(|e| format!("Invalid address: {}", e))?,
        std::time::Duration::from_secs(10),
    )
    .map_err(|e| format!("Connection timeout: {}", e))?;
    let mut session = Session::new().map_err(|e| format!("SSH session error: {}", e))?;
    session.set_tcp_stream(tcp);
    session
        .handshake()
        .map_err(|e| format!("SSH handshake failed: {}", e))?;
    authenticate(&mut session, username, password, key_path)?;
    session.disconnect(None, "Test done", None).ok();
    Ok(())
}
