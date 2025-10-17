-- CORRECTED: Connect category_types with expense_categories and income_categories
-- This script adds foreign key relationships between the tables
-- Fixed to match actual table structures

-- 1. Add type_id column to expense_categories table
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES category_types(id) ON DELETE CASCADE;

-- 2. Add type_id column to income_categories table  
ALTER TABLE income_categories 
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES category_types(id) ON DELETE CASCADE;

-- 3. Create indexes for better performance on foreign keys
CREATE INDEX IF NOT EXISTS idx_expense_categories_type_id ON expense_categories(type_id);
CREATE INDEX IF NOT EXISTS idx_income_categories_type_id ON income_categories(type_id);

-- 4. Update existing expense categories to link to 'Expense' category type
UPDATE expense_categories 
SET type_id = (
    SELECT id FROM category_types WHERE type_name = 'Expense' LIMIT 1
)
WHERE type_id IS NULL;

-- 5. Update existing income categories to link to 'Income' category type
UPDATE income_categories 
SET type_id = (
    SELECT id FROM category_types WHERE type_name = 'Income' LIMIT 1
)
WHERE type_id IS NULL;

-- 6. Add comments to document the relationships
COMMENT ON COLUMN expense_categories.type_id IS 'Foreign key referencing category_types.id - defines the type of expense category';
COMMENT ON COLUMN income_categories.type_id IS 'Foreign key referencing category_types.id - defines the type of income category';

-- 7. Verify the relationships by checking the data
-- This query will show expense categories with their types
SELECT 
    ec.name as expense_category,
    ct.type_name as category_type,
    ct.description as type_description
FROM expense_categories ec
LEFT JOIN category_types ct ON ec.type_id = ct.id
ORDER BY ct.type_name, ec.name;

-- This query will show income categories with their types
SELECT 
    ic.name as income_category,
    ct.type_name as category_type,
    ct.description as type_description
FROM income_categories ic
LEFT JOIN category_types ct ON ic.type_id = ct.id
ORDER BY ct.type_name, ic.name;

-- 8. Create a view for easy querying of all categories with their types
CREATE OR REPLACE VIEW categories_with_types AS
SELECT 
    'expense' as category_table,
    ec.id,
    ec.name,
    ec.type_id,
    ct.type_name,
    ct.description as type_description,
    ec.created_at
FROM expense_categories ec
LEFT JOIN category_types ct ON ec.type_id = ct.id

UNION ALL

SELECT 
    'income' as category_table,
    ic.id,
    ic.name,
    ic.type_id,
    ct.type_name,
    ct.description as type_description,
    ic.created_at
FROM income_categories ic
LEFT JOIN category_types ct ON ic.type_id = ct.id

ORDER BY type_name, name;

-- 9. Grant appropriate permissions
GRANT SELECT ON categories_with_types TO authenticated;

-- 10. Add helpful comments
COMMENT ON TABLE expense_categories IS 'Expense categories linked to category_types via type_id';
COMMENT ON TABLE income_categories IS 'Income categories linked to category_types via type_id';
COMMENT ON VIEW categories_with_types IS 'Unified view of all categories (expense and income) with their types';




