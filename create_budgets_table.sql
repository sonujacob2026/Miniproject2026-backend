-- Budgets table for backend integration (optional). Safe to run on Supabase.
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  overall_monthly NUMERIC(12,2) DEFAULT 0,
  categories JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select_own" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert_own" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update_own" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete_own" ON budgets FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON budgets;
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_budgets_updated_at();


