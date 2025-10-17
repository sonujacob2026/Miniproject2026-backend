-- Create transactions table for ExpenseAI
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN ('Food', 'Rent', 'Transport', 'Shopping', 'Bills', 'EMI', 'Education', 'Entertainment', 'Investments')),
  subcategory TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'Card', 'Cash', 'Bank Transfer')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  tags TEXT[],
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily','weekly','monthly','quarterly','yearly')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safe ALTERs for existing databases (no-op if columns already exist)
DO $$ BEGIN
  BEGIN
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subcategory TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tags TEXT[];
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_frequency TEXT CHECK (recurring_frequency IN ('daily','weekly','monthly','quarterly','yearly'));
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for transaction summary (optional)
CREATE OR REPLACE VIEW transaction_summary AS
SELECT 
  user_id,
  category,
  payment_method,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM transactions
GROUP BY user_id, category, payment_method;

-- Grant necessary permissions
GRANT ALL ON transactions TO authenticated;
GRANT SELECT ON transaction_summary TO authenticated; 