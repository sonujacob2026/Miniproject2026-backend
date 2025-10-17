-- Migration script to add profile_picture_url column to existing user_profiles table
-- Run this if you already have a user_profiles table and need to add the profile picture functionality

-- Add profile_picture_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'profile_picture_url'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN profile_picture_url TEXT;
        
        -- Add comment for documentation
        COMMENT ON COLUMN user_profiles.profile_picture_url IS 'Base64 encoded profile picture or URL to image';
        
        RAISE NOTICE 'Added profile_picture_url column to user_profiles table';
    ELSE
        RAISE NOTICE 'profile_picture_url column already exists in user_profiles table';
    END IF;
END $$;

-- Update the updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;







