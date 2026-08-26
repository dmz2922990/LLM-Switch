CREATE TABLE IF NOT EXISTS reminder_config (
    id TEXT PRIMARY KEY NOT NULL,
    vendor_key TEXT NOT NULL UNIQUE,
    vendor_name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    time1 TEXT,
    time2 TEXT,
    days_of_week TEXT NOT NULL DEFAULT '1,2,3,4,5',
    auto_close INTEGER NOT NULL DEFAULT 0,
    auto_close_seconds INTEGER NOT NULL DEFAULT 10,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default vendor configs
-- NOTE: default peak-hours for bigmodel.cn are set by 009, which runs after
-- 008 adds the time1_start/time1_end columns this table does not have yet.
INSERT OR IGNORE INTO reminder_config (id, vendor_key, vendor_name) VALUES
    ('bigmodel.cn', 'bigmodel.cn', '智谱'),
    ('kimi.com', 'kimi.com', 'Kimi'),
    ('deepseek.com', 'deepseek.com', 'DeepSeek');