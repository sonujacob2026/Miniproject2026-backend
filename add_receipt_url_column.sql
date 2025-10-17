-- Add receipt_url column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add index for receipt_url for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_url ON expenses(receipt_url);

-- Add comment to document the column
COMMENT ON COLUMN expenses.receipt_url IS 'URL of the uploaded receipt image stored in Supabase Storage';

