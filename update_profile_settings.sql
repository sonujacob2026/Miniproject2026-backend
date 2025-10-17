-- PostgreSQL SQL scripts for updating user profile settings
-- This file contains various SQL operations for managing user profiles

-- =====================================================
-- 1. UPDATE PROFILE PICTURE
-- =====================================================

-- Update profile picture for a specific user
UPDATE user_profiles 
SET 
    profile_picture_url = $1,  -- Base64 encoded image or URL
    updated_at = NOW()
WHERE user_id = $2;

-- Example with actual values:
-- UPDATE user_profiles 
-- SET 
--     profile_picture_url = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
--     updated_at = NOW()
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- =====================================================
-- 2. UPDATE BASIC PROFILE INFORMATION
-- =====================================================

-- Update basic profile information
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

-- Example with actual values:
-- UPDATE user_profiles 
-- SET 
--     full_name = 'John Doe',
--     username = 'johndoe',
--     monthly_income = 5000.00,
--     household_members = 2,
--     savings_goal = 'Save for vacation',
--     budgeting_experience = 'intermediate',
--     updated_at = NOW()
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- =====================================================
-- 3. UPDATE FINANCIAL GOALS
-- =====================================================

-- Update financial goals array
UPDATE user_profiles 
SET 
    financial_goals = $1,  -- Array of goals
    updated_at = NOW()
WHERE user_id = $2;

-- Example with actual values:
-- UPDATE user_profiles 
-- SET 
--     financial_goals = ARRAY['Buy a house', 'Save for retirement', 'Emergency fund'],
--     updated_at = NOW()
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- =====================================================
-- 4. UPDATE PRIMARY EXPENSES
-- =====================================================

-- Update primary expenses array
UPDATE user_profiles 
SET 
    primary_expenses = $1,  -- Array of expense categories
    updated_at = NOW()
WHERE user_id = $2;

-- Example with actual values:
-- UPDATE user_profiles 
-- SET 
--     primary_expenses = ARRAY['Housing', 'Food', 'Transportation', 'Entertainment'],
--     updated_at = NOW()
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- =====================================================
-- 5. UPDATE DEBT INFORMATION
-- =====================================================

-- Update debt information
UPDATE user_profiles 
SET 
    has_debt = $1,
    debt_amount = $2,
    updated_at = NOW()
WHERE user_id = $3;

-- Example with actual values:
-- UPDATE user_profiles 
-- SET 
--     has_debt = true,
--     debt_amount = 15000.00,
--     updated_at = NOW()
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- =====================================================
-- 6. COMPREHENSIVE PROFILE UPDATE
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
-- 7. REMOVE PROFILE PICTURE
-- =====================================================

-- Remove profile picture (set to NULL)
UPDATE user_profiles 
SET 
    profile_picture_url = NULL,
    updated_at = NOW()
WHERE user_id = $1;

-- =====================================================
-- 8. UPDATE ONBOARDING STATUS
-- =====================================================

-- Mark onboarding as completed
UPDATE user_profiles 
SET 
    onboarding_completed = true,
    updated_at = NOW()
WHERE user_id = $1;

-- =====================================================
-- 9. UPDATE EMAIL VERIFICATION STATUS
-- =====================================================

-- Update email verification status
UPDATE user_profiles 
SET 
    email_verified = $1,
    updated_at = NOW()
WHERE user_id = $2;

-- =====================================================
-- 10. UPSERT PROFILE (INSERT OR UPDATE)
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
-- 11. QUERY PROFILE INFORMATION
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

-- Get profile picture only
SELECT profile_picture_url 
FROM user_profiles 
WHERE user_id = $1;

-- Check if profile exists
SELECT EXISTS(
    SELECT 1 FROM user_profiles WHERE user_id = $1
) as profile_exists;

-- =====================================================
-- 12. BULK OPERATIONS
-- =====================================================

-- Update multiple users' onboarding status
UPDATE user_profiles 
SET 
    onboarding_completed = true,
    updated_at = NOW()
WHERE user_id IN ($1, $2, $3);

-- Update all inactive users
UPDATE user_profiles 
SET 
    is_active = false,
    updated_at = NOW()
WHERE last_login_at < NOW() - INTERVAL '90 days';

-- =====================================================
-- 13. VALIDATION QUERIES
-- =====================================================

-- Check username availability
SELECT NOT EXISTS(
    SELECT 1 FROM user_profiles WHERE username = $1
) as username_available;

-- Validate email format (PostgreSQL regex)
SELECT 
    CASE 
        WHEN email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
        THEN true 
        ELSE false 
    END as email_valid
FROM user_profiles 
WHERE user_id = $1;

-- =====================================================
-- 14. STATISTICS AND ANALYTICS
-- =====================================================

-- Count users by onboarding status
SELECT 
    onboarding_completed,
    COUNT(*) as user_count
FROM user_profiles 
GROUP BY onboarding_completed;

-- Average monthly income by household size
SELECT 
    household_members,
    AVG(monthly_income) as avg_income,
    COUNT(*) as user_count
FROM user_profiles 
WHERE monthly_income IS NOT NULL
GROUP BY household_members
ORDER BY household_members;

-- Users with profile pictures
SELECT 
    COUNT(*) as total_users,
    COUNT(profile_picture_url) as users_with_pictures,
    ROUND(
        (COUNT(profile_picture_url)::decimal / COUNT(*)) * 100, 2
    ) as percentage_with_pictures
FROM user_profiles;

-- =====================================================
-- 15. CLEANUP OPERATIONS
-- =====================================================

-- Remove old profile pictures (if using URLs instead of base64)
UPDATE user_profiles 
SET 
    profile_picture_url = NULL,
    updated_at = NOW()
WHERE profile_picture_url LIKE 'http%' 
  AND updated_at < NOW() - INTERVAL '1 year';

-- Archive inactive profiles
UPDATE user_profiles 
SET 
    is_active = false,
    updated_at = NOW()
WHERE last_login_at < NOW() - INTERVAL '1 year' 
  AND is_active = true;







