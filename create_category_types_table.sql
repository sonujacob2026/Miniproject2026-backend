-- Create category_types table
CREATE TABLE IF NOT EXISTS category_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_category_types_type_name ON category_types(type_name);
CREATE INDEX IF NOT EXISTS idx_category_types_created_at ON category_types(created_at);

-- Insert default category types
INSERT INTO category_types (type_name, description) VALUES 
    ('Expense', 'Categories for tracking expenses and spending'),
    ('Income', 'Categories for tracking income and earnings'),
    ('Investment', 'Categories for tracking investments and returns'),
    ('Savings', 'Categories for tracking savings and deposits')
ON CONFLICT (type_name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;

-- Create policies for category_types
-- Allow all operations for authenticated users (admin access)
CREATE POLICY "Allow all operations for authenticated users" ON category_types
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow read access for service role
CREATE POLICY "Allow service role full access" ON category_types
    FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_category_types_updated_at 
    BEFORE UPDATE ON category_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
