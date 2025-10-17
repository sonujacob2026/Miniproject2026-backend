-- Supabase PostgreSQL SQL operations for user profile management
-- These queries work directly with Supabase's PostgreSQL database

-- =====================================================
-- 1. UPDATE PROFILE PICTURE (Base64)
-- =====================================================

-- Update profile picture with base64 encoded image
UPDATE user_profiles 
SET 
    profile_picture_url = $1,  -- Base64 string
    updated_at = NOW()
WHERE user_id = $2;

-- Example with actual values:
-- UPDATE user_profiles 
-- SET 
--     profile_picture_url = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
--     updated_at = NOW()
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- =====================================================
-- 2. UPDATE BASIC PROFILE INFORMATION
-- =====================================================

-- Update basic profile fields
UPDATE user_profiles 
SET 
    full_name = $1,
    username = $2,
    monthly_income = $3,
    household_members = $4,
    savings_goal = $5,
    budgeting_experience = $6,
    updated_at = NOW()
WHERE user_id = $7;

-- =====================================================
-- 3. UPDATE FINANCIAL GOALS (Array)
-- =====================================================

-- Update financial goals array
UPDATE user_profiles 
SET 
    financial_goals = $1,  -- Array: ['Buy house', 'Save for retirement']
    updated_at = NOW()
WHERE user_id = $2;

-- Example:
-- UPDATE user_profiles 
-- SET 
--     financial_goals = ARRAY['Buy a house', 'Save for retirement', 'Emergency fund'],
--     updated_at = NOW()
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- =====================================================
-- 4. UPDATE PRIMARY EXPENSES (Array)
-- =====================================================

-- Update primary expenses array
UPDATE user_profiles 
SET 
    primary_expenses = $1,  -- Array: ['Housing', 'Food', 'Transportation']
    updated_at = NOW()
WHERE user_id = $2;

-- =====================================================
-- 5. COMPREHENSIVE PROFILE UPDATE
-- =====================================================

-- Update multiple profile fields at once
UPDATE user_profiles 
SET 
    full_name = $1,
    username = $2,
    profile_picture_url = $3,
    monthly_income = $4,
    household_members = $5,
    has_debt = $6,
    debt_amount = $7,
    savings_goal = $8,
    primary_expenses = $9,
    budgeting_experience = $10,
    financial_goals = $11,
    updated_at = NOW()
WHERE user_id = $12;

-- =====================================================
-- 6. UPSERT PROFILE (INSERT OR UPDATE)
-- =====================================================

-- Insert or update profile (useful for new users)
INSERT INTO user_profiles (
    user_id,
    username,
    full_name,
    email,
    profile_picture_url,
    monthly_income,
    household_members,
    has_debt,
    debt_amount,
    savings_goal,
    primary_expenses,
    budgeting_experience,
    financial_goals,
    onboarding_completed,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    profile_picture_url = EXCLUDED.profile_picture_url,
    monthly_income = EXCLUDED.monthly_income,
    household_members = EXCLUDED.household_members,
    has_debt = EXCLUDED.has_debt,
    debt_amount = EXCLUDED.debt_amount,
    savings_goal = EXCLUDED.savings_goal,
    primary_expenses = EXCLUDED.primary_expenses,
    budgeting_experience = EXCLUDED.budgeting_experience,
    financial_goals = EXCLUDED.financial_goals,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = NOW();

-- =====================================================
-- 7. QUERY PROFILE INFORMATION
-- =====================================================

-- Get complete profile information
SELECT 
    id,
    user_id,
    username,
    full_name,
    email,
    profile_picture_url,
    provider,
    role,
    is_active,
    email_verified,
    household_members,
    monthly_income,
    has_debt,
    debt_amount,
    savings_goal,
    primary_expenses,
    budgeting_experience,
    financial_goals,
    onboarding_completed,
    last_login_at,
    created_at,
    updated_at
FROM user_profiles 
WHERE user_id = $1;

-- =====================================================
-- 8. REMOVE PROFILE PICTURE
-- =====================================================

-- Remove profile picture (set to NULL)
UPDATE user_profiles 
SET 
    profile_picture_url = NULL,
    updated_at = NOW()
WHERE user_id = $1;

-- =====================================================
-- 9. CHECK USERNAME AVAILABILITY
-- =====================================================

-- Check if username is available
SELECT NOT EXISTS(
    SELECT 1 FROM user_profiles WHERE username = $1
) as username_available;

-- =====================================================
-- 10. PROFILE STATISTICS
-- =====================================================

-- Count users with profile pictures
SELECT 
    COUNT(*) as total_users,
    COUNT(profile_picture_url) as users_with_pictures,
    ROUND(
        (COUNT(profile_picture_url)::decimal / COUNT(*)) * 100, 2
    ) as percentage_with_pictures
FROM user_profiles;







