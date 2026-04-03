-- Migration: 002
-- Add is_default to hosts, add hash columns to sync_history

ALTER TABLE hosts ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sync_history ADD COLUMN source_hash TEXT;
ALTER TABLE sync_history ADD COLUMN target_hash TEXT;
