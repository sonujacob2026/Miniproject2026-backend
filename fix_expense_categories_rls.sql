-- Fix RLS policies for expense_categories table
-- This script will update the policies to allow admin operations

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Authenticated users can manage expense categories" ON expense_categories;

-- Create new policies that work with admin mode
-- Allow anyone to read categories (for the expense form)
CREATE POLICY "Anyone can view expense categories" ON expense_categories
  FOR SELECT USING (true);

-- Allow authenticated users OR admin mode to manage categories
CREATE POLICY "Allow category management" ON expense_categories
  FOR ALL USING (
    auth.uid() IS NOT NULL OR 
    current_setting('request.jwt.claims', true)::json->>'role' = 'admin' OR
    current_setting('app.admin_mode', true) = 'true'
  );

-- Alternative: If the above doesn't work, use this simpler approach
-- DROP POLICY IF EXISTS "Allow category management" ON expense_categories;
-- CREATE POLICY "Allow all operations on expense_categories" ON expense_categories
--   FOR ALL USING (true);

-- If you want to be more restrictive, you can also try:
-- CREATE POLICY "Allow category management" ON expense_categories
--   FOR ALL USING (
--     auth.uid() IS NOT NULL OR 
--     current_setting('request.headers', true)::json->>'x-admin-mode' = 'true'
--   );

