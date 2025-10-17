-- Update existing expense_categories table to make icons optional
-- Run this in your Supabase SQL Editor if you already have the table

-- Update the icon column to allow NULL values
ALTER TABLE expense_categories ALTER COLUMN icon DROP NOT NULL;
ALTER TABLE expense_categories ALTER COLUMN icon SET DEFAULT NULL;

-- This makes the icon field optional for both categories and subcategories
-- Existing data will remain unchanged, new entries can have NULL icons

