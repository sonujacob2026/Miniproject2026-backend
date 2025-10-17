-- Fix expenses table schema for receipt upload and dynamic categories
-- This script addresses schema inconsistencies and adds missing columns

-- 1. Remove restrictive category constraint and add foreign key to expense_categories
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_category 
  FOREIGN KEY (category) REFERENCES expense_categories(category);

-- 2. Add missing UPI ID column
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- 3. Remove restrictive payment method constraint (make it more flexible)
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

-- 4. Add receipt_url column if not already added
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 5. Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_expenses_upi_id ON expenses(upi_id);
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_url ON expenses(receipt_url);

-- 6. Add comments for documentation
COMMENT ON COLUMN expenses.upi_id IS 'UPI ID for payment tracking (e.g., username@okaxis)';
COMMENT ON COLUMN expenses.receipt_url IS 'URL of the uploaded receipt image stored in Supabase Storage';

-- 7. Update the same for transactions table (if it exists)
DO $$ 
BEGIN
  -- Check if transactions table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    -- Remove restrictive constraints
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
    
    -- Add missing columns
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS upi_id TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;
    
    -- Add indexes
    CREATE INDEX IF NOT EXISTS idx_transactions_upi_id ON transactions(upi_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_receipt_url ON transactions(receipt_url);
    
    -- Add comments
    COMMENT ON COLUMN transactions.upi_id IS 'UPI ID for payment tracking (e.g., username@okaxis)';
    COMMENT ON COLUMN transactions.receipt_url IS 'URL of the uploaded receipt image stored in Supabase Storage';
  END IF;
END $$;

