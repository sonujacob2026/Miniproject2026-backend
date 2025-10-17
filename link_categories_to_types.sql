-- Add category_type_id to expense_categories table
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS category_type_id UUID REFERENCES category_types(id);

-- Add category_type_id to income_categories table  
ALTER TABLE income_categories 
ADD COLUMN IF NOT EXISTS category_type_id UUID REFERENCES category_types(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_category_type_id ON expense_categories(category_type_id);
CREATE INDEX IF NOT EXISTS idx_income_categories_category_type_id ON income_categories(category_type_id);

-- Update existing expense categories to link to 'Expense' category type
UPDATE expense_categories 
SET category_type_id = (
    SELECT id FROM category_types WHERE type_name = 'Expense' LIMIT 1
)
WHERE category_type_id IS NULL;

-- Update existing income categories to link to 'Income' category type
UPDATE income_categories 
SET category_type_id = (
    SELECT id FROM category_types WHERE type_name = 'Income' LIMIT 1
)
WHERE category_type_id IS NULL;

-- Add constraints to ensure category_type_id is not null for new records
ALTER TABLE expense_categories 
ALTER COLUMN category_type_id SET NOT NULL;

ALTER TABLE income_categories 
ALTER COLUMN category_type_id SET NOT NULL;

