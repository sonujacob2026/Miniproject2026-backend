-- Create incomes table for ExpenseAI
CREATE TABLE IF NOT EXISTS incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  subcategory TEXT,
  payment_method TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  tags TEXT[],
  notes TEXT,
  upi_id TEXT,
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily','weekly','monthly','quarterly','yearly')),
  category_id UUID REFERENCES income_categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES income_subcategories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_category ON incomes(category);
CREATE INDEX IF NOT EXISTS idx_incomes_payment_method ON incomes(payment_method);
CREATE INDEX IF NOT EXISTS idx_incomes_category_id ON incomes(category_id);
CREATE INDEX IF NOT EXISTS idx_incomes_subcategory_id ON incomes(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_incomes_upi_id ON incomes(upi_id);
CREATE INDEX IF NOT EXISTS idx_incomes_receipt_url ON incomes(receipt_url);

-- Enable Row Level Security (RLS)
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own incomes" ON incomes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incomes" ON incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own incomes" ON incomes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own incomes" ON incomes
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_incomes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trg_incomes_updated_at ON incomes;
CREATE TRIGGER trg_incomes_updated_at 
  BEFORE UPDATE ON incomes 
  FOR EACH ROW EXECUTE FUNCTION update_incomes_updated_at();

-- Add comments for documentation
COMMENT ON COLUMN incomes.upi_id IS 'UPI ID for payment tracking (e.g., username@okaxis)';
COMMENT ON COLUMN incomes.receipt_url IS 'URL of the uploaded receipt image stored in Supabase Storage';
COMMENT ON COLUMN incomes.category_id IS 'Foreign key referencing income_categories.id';
COMMENT ON COLUMN incomes.subcategory_id IS 'Foreign key referencing income_subcategories.id';

-- Grant necessary permissions
GRANT ALL ON incomes TO authenticated;



