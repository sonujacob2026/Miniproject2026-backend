-- Add password column to user_profiles table
-- This script adds a password column to store user passwords

-- Add password column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Add comment to describe the column
COMMENT ON COLUMN public.user_profiles.password IS 'User password (hashed)';

-- Create index for password column if needed (optional)
-- CREATE INDEX IF NOT EXISTS idx_user_profiles_password ON public.user_profiles(password);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
AND column_name = 'password';
