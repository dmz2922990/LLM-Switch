export interface Profile {
  id: string;
  name: string;
  settings_json: string;
  is_active: boolean;
  sort_order: number;
  sync_keys: string;
  created_at: string;
  updated_at: string;
}

export interface Host {
  id: string;
  name: string;
  address: string;
  port: number;
  username: string;
  auth_type: string;
  encrypted_password: string | null;
  key_path: string | null;
  remote_path: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncHistory {
  id: string;
  profile_id: string;
  host_id: string;
  synced_at: string;
  status: string;
  error_message: string | null;
  source_hash: string | null;
  target_hash: string | null;
}

export interface SyncResult {
  profile_id: string;
  host_id: string;
  success: boolean;
  error_message: string | null;
}

export type TabId = "editor" | "sync" | "hosts";
