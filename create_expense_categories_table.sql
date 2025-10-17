-- Create expense_categories table for dynamic category management
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  icon TEXT DEFAULT NULL,
  subcategories JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_category ON expense_categories(category);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - Allow all authenticated users to read categories
CREATE POLICY "Anyone can view expense categories" ON expense_categories
  FOR SELECT USING (true);

-- Only allow authenticated users to manage categories (admin functionality)
CREATE POLICY "Authenticated users can manage expense categories" ON expense_categories
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expense_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER trg_expense_categories_updated_at 
  BEFORE UPDATE ON expense_categories 
  FOR EACH ROW EXECUTE FUNCTION update_expense_categories_updated_at();

-- Insert default categories based on the existing EXPENSE_CATEGORIES structure
INSERT INTO expense_categories (category, icon, subcategories) VALUES
('Utilities', '⚡', '[
  {"name": "Electricity Bill", "icon": "💡", "isRecurring": true, "frequency": "monthly"},
  {"name": "Water Bill", "icon": "💧", "isRecurring": true, "frequency": "monthly"},
  {"name": "Gas Bill", "icon": "🔥", "isRecurring": true, "frequency": "monthly"},
  {"name": "Internet/Broadband", "icon": "🌐", "isRecurring": true, "frequency": "monthly"},
  {"name": "Landline Phone", "icon": "📞", "isRecurring": true, "frequency": "monthly"},
  {"name": "Mobile Recharge", "icon": "📱", "isRecurring": true, "frequency": "monthly"},
  {"name": "Cable TV", "icon": "📺", "isRecurring": true, "frequency": "monthly"},
  {"name": "Other Utilities", "icon": "⚙️", "isRecurring": false}
]'::jsonb),

('Housing', '🏠', '[
  {"name": "Rent/Mortgage", "icon": "🏡", "isRecurring": true, "frequency": "monthly"},
  {"name": "Home Insurance", "icon": "🛡️", "isRecurring": true, "frequency": "yearly"},
  {"name": "Property Tax", "icon": "📋", "isRecurring": true, "frequency": "yearly"},
  {"name": "Maintenance", "icon": "🔧", "isRecurring": false},
  {"name": "Repairs", "icon": "🛠️", "isRecurring": false},
  {"name": "Cleaning Services", "icon": "🧹", "isRecurring": false},
  {"name": "Security Services", "icon": "🔒", "isRecurring": true, "frequency": "monthly"}
]'::jsonb),

('Financial', '💰', '[
  {"name": "Loan Payment", "icon": "🏦", "isRecurring": true, "frequency": "monthly"},
  {"name": "EMI", "icon": "📊", "isRecurring": true, "frequency": "monthly"},
  {"name": "LIC Premium", "icon": "🛡️", "isRecurring": true, "frequency": "yearly"},
  {"name": "Investment", "icon": "📈", "isRecurring": false},
  {"name": "SIP", "icon": "💹", "isRecurring": true, "frequency": "monthly"},
  {"name": "Credit Card Payment", "icon": "💳", "isRecurring": false}
]'::jsonb),

('Food & Dining', '🍽️', '[
  {"name": "Groceries", "icon": "🛒", "isRecurring": false},
  {"name": "Restaurants", "icon": "🍴", "isRecurring": false},
  {"name": "Takeaway", "icon": "🥡", "isRecurring": false},
  {"name": "Coffee/Tea", "icon": "☕", "isRecurring": false},
  {"name": "Snacks", "icon": "🍿", "isRecurring": false}
]'::jsonb),

('Transportation', '🚗', '[
  {"name": "Fuel", "icon": "⛽", "isRecurring": false},
  {"name": "Public Transport", "icon": "🚌", "isRecurring": false},
  {"name": "Taxi/Uber", "icon": "🚕", "isRecurring": false},
  {"name": "Parking", "icon": "🅿️", "isRecurring": false},
  {"name": "Toll", "icon": "🛣️", "isRecurring": false},
  {"name": "Vehicle Maintenance", "icon": "🔧", "isRecurring": false}
]'::jsonb),

('Healthcare', '🏥', '[
  {"name": "Doctor Visit", "icon": "👨‍⚕️", "isRecurring": false},
  {"name": "Medicine", "icon": "💊", "isRecurring": false},
  {"name": "Health Insurance", "icon": "🏥", "isRecurring": true, "frequency": "yearly"},
  {"name": "Dental", "icon": "🦷", "isRecurring": false},
  {"name": "Optical", "icon": "👓", "isRecurring": false}
]'::jsonb),

('Education', '📚', '[
  {"name": "School Fees", "icon": "🏫", "isRecurring": true, "frequency": "monthly"},
  {"name": "Books", "icon": "📖", "isRecurring": false},
  {"name": "Tuition", "icon": "👨‍🏫", "isRecurring": false},
  {"name": "Course Fees", "icon": "🎓", "isRecurring": false},
  {"name": "Stationery", "icon": "✏️", "isRecurring": false}
]'::jsonb),

('Entertainment', '🎬', '[
  {"name": "Movies", "icon": "🎬", "isRecurring": false},
  {"name": "Streaming Services", "icon": "📺", "isRecurring": true, "frequency": "monthly"},
  {"name": "Gaming", "icon": "🎮", "isRecurring": false},
  {"name": "Hobbies", "icon": "🎨", "isRecurring": false},
  {"name": "Sports", "icon": "⚽", "isRecurring": false}
]'::jsonb),

('Shopping', '🛍️', '[
  {"name": "Clothing", "icon": "👕", "isRecurring": false},
  {"name": "Electronics", "icon": "📱", "isRecurring": false},
  {"name": "Home Decor", "icon": "🏠", "isRecurring": false},
  {"name": "Personal Care", "icon": "🧴", "isRecurring": false},
  {"name": "Gifts", "icon": "🎁", "isRecurring": false},
  {"name": "Online Shopping", "icon": "📦", "isRecurring": false}
]'::jsonb),

('Miscellaneous', '📋', '[
  {"name": "Donations", "icon": "❤️", "isRecurring": false},
  {"name": "Pet Expenses", "icon": "🐕", "isRecurring": false},
  {"name": "Emergency Fund", "icon": "🚨", "isRecurring": false},
  {"name": "Other", "icon": "📝", "isRecurring": false}
]'::jsonb)

ON CONFLICT (category) DO NOTHING;
