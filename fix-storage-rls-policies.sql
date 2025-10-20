-- Fix RLS policies for Supabase Storage and tables
-- This script fixes the "new row violates row-level security policy" error

-- 1. Fix Storage Bucket Policies for receipts
-- First, ensure the receipts bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  updated_at = NOW();

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;

-- Create new storage policies for receipts bucket
CREATE POLICY "Users can upload receipts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own receipts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'receipts' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own receipts" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'receipts' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own receipts" ON storage.objects
FOR DELETE USING (
  bucket_id = 'receipts' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to receipts (optional - for sharing)
CREATE POLICY "Anyone can view receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'receipts');

-- 2. Fix user_profiles table RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON user_profiles;

-- Create new policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON user_profiles
FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to manage all profiles (for backend operations)
CREATE POLICY "Service role can manage profiles" ON user_profiles
FOR ALL USING (auth.role() = 'service_role');

-- 3. Fix transactions table RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON transactions;

-- Create new policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to manage all transactions
CREATE POLICY "Service role can manage transactions" ON transactions
FOR ALL USING (auth.role() = 'service_role');

-- 4. Fix expenses table RLS policies (if it exists)
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
DROP POLICY IF EXISTS "Service role can manage expenses" ON expenses;

-- Create new policies for expenses
CREATE POLICY "Users can view own expenses" ON expenses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to manage all expenses
CREATE POLICY "Service role can manage expenses" ON expenses
FOR ALL USING (auth.role() = 'service_role');

-- 5. Fix income_records table RLS policies (if it exists)
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own income records" ON income_records;
DROP POLICY IF EXISTS "Users can insert own income records" ON income_records;
DROP POLICY IF EXISTS "Users can update own income records" ON income_records;
DROP POLICY IF EXISTS "Users can delete own income records" ON income_records;
DROP POLICY IF EXISTS "Service role can manage income records" ON income_records;

-- Create new policies for income_records
CREATE POLICY "Users can view own income records" ON income_records
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income records" ON income_records
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income records" ON income_records
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income records" ON income_records
FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to manage all income records
CREATE POLICY "Service role can manage income records" ON income_records
FOR ALL USING (auth.role() = 'service_role');

-- 6. Fix expense_categories table RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Authenticated users can manage expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Service role can manage expense categories" ON expense_categories;

-- Create new policies for expense_categories
CREATE POLICY "Anyone can view expense categories" ON expense_categories
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage expense categories" ON expense_categories
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage expense categories" ON expense_categories
FOR ALL USING (auth.role() = 'service_role');

-- 7. Grant necessary permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON income_records TO authenticated;
GRANT ALL ON expense_categories TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 8. Create helper function for storage path validation
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- 9. Ensure all tables have proper RLS enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- 10. Verify storage bucket configuration
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
WHERE id = 'receipts';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies fixed successfully!';
    RAISE NOTICE '✅ Storage bucket policies updated!';
    RAISE NOTICE '✅ All table policies updated!';
    RAISE NOTICE '✅ Service role permissions granted!';
    RAISE NOTICE '✅ Ready for receipt uploads and user operations!';
END $$;
