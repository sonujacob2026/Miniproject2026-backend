-- financial_goal table to match user's Supabase naming
CREATE TABLE IF NOT EXISTS financial_goal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  saved_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE financial_goal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_goal_select_own" ON financial_goal FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "financial_goal_insert_own" ON financial_goal FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "financial_goal_update_own" ON financial_goal FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "financial_goal_delete_own" ON financial_goal FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_fin_goal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fin_goal_updated_at ON financial_goal;
CREATE TRIGGER trg_fin_goal_updated_at BEFORE UPDATE ON financial_goal FOR EACH ROW EXECUTE FUNCTION update_fin_goal_updated_at();


