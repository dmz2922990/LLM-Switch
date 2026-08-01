export function parseTopLevelKeys(json: string): string[] {
  try {
    const obj = JSON.parse(json);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return Object.keys(obj);
    }
  } catch {}
  return [];
}

export function parseSyncKeys(syncKeysJson: string): string[] {
  try {
    return JSON.parse(syncKeysJson);
  } catch {}
  return ["env"];
}
