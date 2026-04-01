use sqlx::SqlitePool;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;
use ssh2::Session;
use crate::models::sync_history::SyncResult;
use crate::services::{host_service, profile_service, sync_history_service};

pub async fn sync_to_host(pool: &SqlitePool, profile_id: &str, host_id: &str) -> SyncResult {
    let profile = match profile_service::get_by_id(pool, profile_id).await {
        Ok(p) => p,
        Err(e) => return SyncResult { profile_id: profile_id.to_string(), host_id: host_id.to_string(), success: false, error_message: Some(e) },
    };
    let host = match host_service::get_by_id(pool, host_id).await {
        Ok(h) => h,
        Err(e) => return SyncResult { profile_id: profile_id.to_string(), host_id: host_id.to_string(), success: false, error_message: Some(e) },
    };
    let password = match host_service::get_password(pool, host_id).await {
        Ok(p) => p,
        Err(e) => return SyncResult { profile_id: profile_id.to_string(), host_id: host_id.to_string(), success: false, error_message: Some(e) },
    };
    match do_scp_upload(&host.address, host.port, &host.username, password.as_deref(), host.key_path.as_deref(), &host.remote_path, &profile.settings_json) {
        Ok(()) => {
            let _ = sync_history_service::record(pool, profile_id, host_id, "success", None).await;
            SyncResult { profile_id: profile_id.to_string(), host_id: host_id.to_string(), success: true, error_message: None }
        }
        Err(e) => {
            let err_msg = e.clone();
            let _ = sync_history_service::record(pool, profile_id, host_id, "failed", Some(&err_msg)).await;
            SyncResult { profile_id: profile_id.to_string(), host_id: host_id.to_string(), success: false, error_message: Some(e) }
        }
    }
}

pub async fn sync_to_hosts(pool: &SqlitePool, profile_id: &str, host_ids: &[String]) -> Vec<SyncResult> {
    let mut results = Vec::new();
    for host_id in host_ids {
        let result = sync_to_host(pool, profile_id, host_id).await;
        results.push(result);
    }
    results
}

fn do_scp_upload(address: &str, port: i32, username: &str, password: Option<&str>, key_path: Option<&str>, remote_path: &str, content: &str) -> Result<(), String> {
    let addr = format!("{}:{}", address, port);
    let tcp = TcpStream::connect(&addr).map_err(|e| format!("Connection failed ({}): {}", addr, e))?;
    let mut session = Session::new().map_err(|e| format!("SSH session error: {}", e))?;
    session.set_tcp_stream(tcp);
    session.handshake().map_err(|e| format!("SSH handshake failed: {}", e))?;
    authenticate(&mut session, username, password, key_path)?;
    let remote = expand_remote_path(&session, remote_path)?;
    upload_content(&session, &remote, content)?;
    session.disconnect(None, "Done", None).ok();
    Ok(())
}

fn authenticate(session: &mut Session, username: &str, password: Option<&str>, key_path: Option<&str>) -> Result<(), String> {
    if let Some(kp) = key_path {
        session.userauth_pubkey_file(username, None, Path::new(kp), None)
            .map_err(|e| format!("Key auth failed: {}", e))
    } else if let Some(pwd) = password {
        session.userauth_password(username, pwd)
            .map_err(|e| format!("Password auth failed: {}", e))
    } else {
        Err("No authentication method provided".to_string())
    }
}

fn expand_remote_path(session: &Session, path: &str) -> Result<String, String> {
    if path.starts_with('~') {
        let mut channel = session.channel_session().map_err(|e| format!("Failed to open channel: {}", e))?;
        channel.exec("echo -n $HOME").map_err(|e| format!("Failed to exec: {}", e))?;
        let mut home = String::new();
        channel.read_to_string(&mut home).ok();
        channel.wait_close().ok();
        Ok(path.replacen('~', &home, 1))
    } else {
        Ok(path.to_string())
    }
}

fn upload_content(session: &Session, remote_path: &str, content: &str) -> Result<(), String> {
    let size = content.len() as u64;
    let sftp = session.sftp().map_err(|e| format!("SFTP init failed: {}", e))?;
    let path = Path::new(remote_path);
    if let Some(parent) = path.parent() {
        let _ = sftp.mkdir(parent, 0o755);
    }
    let mut file = sftp.create(path).map_err(|e| format!("Failed to create remote file: {}", e))?;
    file.write_all(content.as_bytes()).map_err(|e| format!("Failed to write content: {}", e))?;
    file.close().map_err(|e| format!("Close error: {}", e))?;
    Ok(())
}

pub fn test_connection(address: &str, port: i32, username: &str, password: Option<&str>, key_path: Option<&str>) -> Result<(), String> {
    let addr = format!("{}:{}", address, port);
    let tcp = TcpStream::connect_timeout(&addr.parse().map_err(|e| format!("Invalid address: {}", e))?, std::time::Duration::from_secs(10))
        .map_err(|e| format!("Connection timeout: {}", e))?;
    let mut session = Session::new().map_err(|e| format!("SSH session error: {}", e))?;
    session.set_tcp_stream(tcp);
    session.handshake().map_err(|e| format!("SSH handshake failed: {}", e))?;
    authenticate(&mut session, username, password, key_path)?;
    session.disconnect(None, "Test done", None).ok();
    Ok(())
}
