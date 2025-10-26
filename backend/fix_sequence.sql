-- Fix the sheets table sequence to prevent duplicate key errors
-- This resets the sequence to start after the current maximum ID

-- First, check current max ID
SELECT MAX(id) FROM sheets;

-- Reset the sequence to start after the current max ID
SELECT setval('sheets_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM sheets), false);

-- Verify the sequence is now correct
SELECT last_value FROM sheets_id_seq;