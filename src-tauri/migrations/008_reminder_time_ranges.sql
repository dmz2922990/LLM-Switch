-- Replace time1/time2 with start/end time ranges
ALTER TABLE reminder_config ADD COLUMN time1_start TEXT;
ALTER TABLE reminder_config ADD COLUMN time1_end TEXT;
ALTER TABLE reminder_config ADD COLUMN time2_start TEXT;
ALTER TABLE reminder_config ADD COLUMN time2_end TEXT;