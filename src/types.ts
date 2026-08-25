export interface Profile {
  id: string;
  name: string;
  settings_json: string;
  is_active: boolean;
  sort_order: number;
  sync_keys: string;
  activation_time: string | null;
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

export interface QuotaInfo {
  label: string;
  percentage: number;
  next_reset_time: number;
  remaining?: string;
  usage?: number;
}

export interface UsageInfo {
  provider_name: string;
  quotas: QuotaInfo[];
}

export interface ActivationLog {
  id: string;
  profile_id: string;
  activated_at: string;
  status: string;
  error_message: string | null;
  http_status: number | null;
}

export interface ReminderConfig {
  id: string;
  vendor_key: string;
  vendor_name: string;
  enabled: boolean;
  time1_start: string | null;
  time1_end: string | null;
  time2_start: string | null;
  time2_end: string | null;
  days_of_week: string;
  auto_close: boolean;
  auto_close_seconds: number;
  created_at: string;
  updated_at: string;
}
