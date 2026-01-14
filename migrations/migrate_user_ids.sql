-- Migration: Update user IDs from FC0000 to FC0000000001 format
-- Run this SQL directly if you prefer SQL over Node.js script

-- Step 1: Check current state
SELECT 
    COUNT(*) as total_users,
    MIN(unique_id) as first_id,
    MAX(unique_id) as last_id
FROM users 
WHERE unique_id LIKE 'FC%';

-- Step 2: Preview what will change (first 10 users)
SELECT 
    id,
    unique_id as old_id,
    CONCAT('FC', LPAD(SUBSTRING(unique_id, 3), 10, '0')) as new_id
FROM users 
WHERE unique_id LIKE 'FC%' 
    AND LENGTH(unique_id) < 12
ORDER BY id
LIMIT 10;

-- Step 3: Perform the migration
UPDATE users 
SET unique_id = CONCAT('FC', LPAD(SUBSTRING(unique_id, 3), 10, '0'))
WHERE unique_id LIKE 'FC%' 
    AND LENGTH(unique_id) < 12;

-- Step 4: Verify migration
SELECT 
    COUNT(*) as migrated_users,
    MIN(unique_id) as first_new_id,
    MAX(unique_id) as last_new_id
FROM users 
WHERE unique_id LIKE 'FC%' 
    AND LENGTH(unique_id) = 12;

-- Step 5: Check for any remaining short IDs
SELECT 
    id,
    unique_id
FROM users 
WHERE unique_id LIKE 'FC%' 
    AND LENGTH(unique_id) < 12;
