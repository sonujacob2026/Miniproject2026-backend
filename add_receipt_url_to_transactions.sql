-- Add receipt_url column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add index for receipt_url for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_url ON transactions(receipt_url);

-- Add comment to document the column
COMMENT ON COLUMN transactions.receipt_url IS 'URL of the uploaded receipt image stored in Supabase Storage';

