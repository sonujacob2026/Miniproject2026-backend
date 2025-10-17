-- Migration to remove username column from user_profiles table
-- This migration removes the username field from the user_profiles table

-- First, let's check if the username column exists
DO $$ 
BEGIN
    -- Check if the username column exists in user_profiles table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'username'
    ) THEN
        -- Remove the username column
        ALTER TABLE user_profiles DROP COLUMN username;
        RAISE NOTICE 'Username column removed from user_profiles table';
    ELSE
        RAISE NOTICE 'Username column does not exist in user_profiles table';
    END IF;
END $$;

-- Optional: If you want to also remove any indexes on the username column
-- (This is usually not necessary as dropping the column removes associated indexes)
-- DROP INDEX IF EXISTS idx_user_profiles_username;

-- Verify the column has been removed
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

