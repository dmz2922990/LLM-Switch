use aes_gcm::aead::{rand_core::RngCore, Aead, KeyInit, OsRng};
use aes_gcm::{aead::generic_array::GenericArray, Aes256Gcm, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use std::sync::OnceLock;

const NONCE_SIZE: usize = 12;

static CACHED_KEY: OnceLock<Vec<u8>> = OnceLock::new();

fn get_or_create_key() -> Result<Vec<u8>, String> {
    if let Some(key) = CACHED_KEY.get() {
        return Ok(key.clone());
    }
    let key = load_or_create_file_key()?;
    let _ = CACHED_KEY.set(key.clone());
    Ok(key)
}

fn load_or_create_file_key() -> Result<Vec<u8>, String> {
    let config_dir = dirs::config_dir().ok_or("Cannot find config directory")?;
    let key_file = config_dir.join("llm-switch").join(".master-key");
    if key_file.exists() {
        let key_b64 = std::fs::read_to_string(&key_file)
            .map_err(|e| format!("Failed to read key file: {}", e))?;
        return BASE64
            .decode(key_b64.trim())
            .map_err(|e| format!("Failed to decode key: {}", e));
    }
    std::fs::create_dir_all(key_file.parent().unwrap()).ok();
    let key = generate_key();
    let key_b64 = BASE64.encode(&key);
    std::fs::write(&key_file, &key_b64).map_err(|e| format!("Failed to write key file: {}", e))?;
    Ok(key)
}

fn generate_key() -> Vec<u8> {
    let key = Aes256Gcm::generate_key(OsRng);
    key.to_vec()
}

pub fn encrypt(plaintext: &str) -> Result<String, String> {
    let key_bytes = get_or_create_key()?;
    let key = GenericArray::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let mut nonce_bytes = [0u8; NONCE_SIZE];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(&combined))
}

pub fn decrypt(encrypted: &str) -> Result<String, String> {
    let combined = BASE64
        .decode(encrypted)
        .map_err(|e| format!("Failed to decode: {}", e))?;
    if combined.len() < NONCE_SIZE {
        return Err("Invalid encrypted data".to_string());
    }
    let (nonce_bytes, ciphertext) = combined.split_at(NONCE_SIZE);
    let key_bytes = get_or_create_key()?;
    let key = GenericArray::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
}
