-- Migration: 003
-- Add sort_order column to profiles for manual drag-and-drop ordering

ALTER TABLE profiles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Populate sort_order based on existing created_at ordering
UPDATE profiles SET sort_order = (
    SELECT COUNT(*) FROM profiles p2
    WHERE p2.created_at <= profiles.created_at
);
