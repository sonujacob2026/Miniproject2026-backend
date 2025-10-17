-- Essential schema changes to connect category_types with expense_categories and income_categories
-- Run this in Supabase SQL Editor

-- 1. Add foreign key columns
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES category_types(id) ON DELETE CASCADE;

ALTER TABLE income_categories 
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES category_types(id) ON DELETE CASCADE;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_type_id ON expense_categories(type_id);
CREATE INDEX IF NOT EXISTS idx_income_categories_type_id ON income_categories(type_id);

-- 3. Link existing data to appropriate category types
UPDATE expense_categories 
SET type_id = (SELECT id FROM category_types WHERE type_name = 'Expense' LIMIT 1)
WHERE type_id IS NULL;

UPDATE income_categories 
SET type_id = (SELECT id FROM category_types WHERE type_name = 'Income' LIMIT 1)
WHERE type_id IS NULL;

-- 4. Verify the changes
SELECT 'Expense Categories with Types:' as info;
SELECT ec.name, ct.type_name 
FROM expense_categories ec 
LEFT JOIN category_types ct ON ec.type_id = ct.id;

SELECT 'Income Categories with Types:' as info;
SELECT ic.name, ct.type_name 
FROM income_categories ic 
LEFT JOIN category_types ct ON ic.type_id = ct.id;
