-- Quick fix for expense_categories update issues
-- Run this in your Supabase SQL Editor

-- Option 1: Temporarily disable RLS for testing
ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled, use this policy instead
-- ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Anyone can view expense categories" ON expense_categories;
-- DROP POLICY IF EXISTS "Authenticated users can manage expense categories" ON expense_categories;
-- 
-- CREATE POLICY "Allow all operations" ON expense_categories
--   FOR ALL USING (true);

-- This will allow all operations on the expense_categories table
-- You can re-enable RLS later with proper policies if needed

