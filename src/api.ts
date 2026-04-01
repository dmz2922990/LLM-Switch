import { invoke } from "@tauri-apps/api/core";
import type { Profile, Host, SyncHistory, SyncResult } from "./types";

// Profile API
export const api = {
  profile: {
    create: (name: string, settingsJson?: string) =>
      invoke<Profile>("create_profile", { input: { name, settings_json: settingsJson } }),
    list: () => invoke<Profile[]>("list_profiles"),
    get: (id: string) => invoke<Profile>("get_profile", { id }),
    rename: (id: string, newName: string) =>
      invoke<Profile>("rename_profile", { id, newName }),
    copy: (id: string) => invoke<Profile>("copy_profile", { id }),
    delete: (id: string) => invoke<void>("delete_profile", { id }),
    setActive: (id: string) => invoke<Profile>("set_active_profile", { id }),
    getActive: () => invoke<Profile | null>("get_active_profile"),
    updateSettings: (id: string, settingsJson: string) =>
      invoke<Profile>("update_profile_settings", { id, settingsJson }),
  },
  host: {
    create: (input: {
      name: string; address: string; port?: number; username: string;
      auth_type?: string; password?: string; key_path?: string; remote_path?: string;
    }) => invoke<Host>("create_host", { input }),
    list: () => invoke<Host[]>("list_hosts"),
    update: (input: {
      id: string; name?: string; address?: string; port?: number;
      username?: string; password?: string; key_path?: string; remote_path?: string;
    }) => invoke<Host>("update_host", { input }),
    delete: (id: string) => invoke<void>("delete_host", { id }),
    testConnection: (address: string, port: number, username: string, password?: string, keyPath?: string) =>
      invoke<void>("test_host_connection", { address, port, username, password, keyPath }),
    testSaved: (hostId: string) =>
      invoke<void>("test_saved_host", { hostId }),
  },
  sync: {
    toHost: (profileId: string, hostId: string) =>
      invoke<SyncResult>("sync_to_host", { profileId, hostId }),
    toHosts: (profileId: string, hostIds: string[]) =>
      invoke<SyncResult[]>("sync_to_hosts", { profileId, hostIds }),
    history: (profileId?: string, hostId?: string) =>
      invoke<SyncHistory[]>("list_sync_history", { profileId, hostId }),
  },
};
