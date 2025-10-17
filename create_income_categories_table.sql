-- Create income_categories table
CREATE TABLE IF NOT EXISTS income_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create income_subcategories table
CREATE TABLE IF NOT EXISTS income_subcategories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES income_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_income_subcategories_category_id ON income_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_income_subcategories_is_recurring ON income_subcategories(is_recurring);

-- Enable Row Level Security (RLS)
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_subcategories ENABLE ROW LEVEL SECURITY;

-- Create policies for income_categories
CREATE POLICY "Allow all users to read income categories" ON income_categories
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert income categories" ON income_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update income categories" ON income_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete income categories" ON income_categories
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for income_subcategories
CREATE POLICY "Allow all users to read income subcategories" ON income_subcategories
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert income subcategories" ON income_subcategories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update income subcategories" ON income_subcategories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete income subcategories" ON income_subcategories
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insert some default income categories
INSERT INTO income_categories (name) VALUES 
    ('Salary'),
    ('Investments'),
    ('Sales'),
    ('Agricultural'),
    ('Business'),
    ('Freelance'),
    ('Rental Income'),
    ('Other')
ON CONFLICT (name) DO NOTHING;

-- Insert some default income subcategories
INSERT INTO income_subcategories (category_id, name, is_recurring) 
SELECT 
    ic.id,
    subcat.name,
    subcat.is_recurring
FROM income_categories ic
CROSS JOIN (
    VALUES 
        ('Salary', 'Basic Salary', true),
        ('Salary', 'Bonus', false),
        ('Salary', 'Overtime', false),
        ('Investments', 'Dividends', true),
        ('Investments', 'Interest', true),
        ('Investments', 'Capital Gains', false),
        ('Sales', 'Product Sales', false),
        ('Sales', 'Service Sales', false),
        ('Agricultural', 'Crop Sales', false),
        ('Agricultural', 'Livestock Sales', false),
        ('Business', 'Revenue', false),
        ('Business', 'Commission', false),
        ('Freelance', 'Project Payment', false),
        ('Freelance', 'Consulting', false),
        ('Rental Income', 'Property Rent', true),
        ('Rental Income', 'Equipment Rent', false),
        ('Other', 'Gift', false),
        ('Other', 'Refund', false)
) AS subcat(category_name, name, is_recurring)
WHERE ic.name = subcat.category_name
ON CONFLICT (category_id, name) DO NOTHING;

