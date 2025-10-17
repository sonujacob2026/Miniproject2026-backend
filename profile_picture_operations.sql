-- PostgreSQL SQL operations specifically for profile picture management
-- This file contains SQL queries for handling profile pictures

-- =====================================================
-- PROFILE PICTURE OPERATIONS
-- =====================================================

-- 1. UPDATE PROFILE PICTURE (Base64 encoded)
-- Use this when storing base64 encoded images directly in the database
UPDATE user_profiles 
SET 
    profile_picture_url = $1,  -- Base64 string: 'data:image/jpeg;base64,/9j/4AAQ...'
    updated_at = NOW()
WHERE user_id = $2;

-- Example:
-- UPDATE user_profiles 
-- SET 
--     profile_picture_url = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
--     updated_at = NOW()
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- 2. UPDATE PROFILE PICTURE (URL)
-- Use this when storing image URLs instead of base64
UPDATE user_profiles 
SET 
    profile_picture_url = $1,  -- URL string: 'https://example.com/images/profile.jpg'
    updated_at = NOW()
WHERE user_id = $2;

-- Example:
-- UPDATE user_profiles 
-- SET 
--     profile_picture_url = 'https://myapp.com/uploads/profiles/user123.jpg',
--     updated_at = NOW()
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- 3. REMOVE PROFILE PICTURE
-- Set profile picture to NULL to remove it
UPDATE user_profiles 
SET 
    profile_picture_url = NULL,
    updated_at = NOW()
WHERE user_id = $1;

-- 4. GET PROFILE PICTURE
-- Retrieve profile picture for a specific user
SELECT profile_picture_url 
FROM user_profiles 
WHERE user_id = $1;

-- 5. CHECK IF USER HAS PROFILE PICTURE
-- Check if a user has a profile picture set
SELECT 
    CASE 
        WHEN profile_picture_url IS NOT NULL AND profile_picture_url != '' 
        THEN true 
        ELSE false 
    END as has_profile_picture
FROM user_profiles 
WHERE user_id = $1;

-- 6. GET PROFILE PICTURE WITH USER INFO
-- Get profile picture along with basic user information
SELECT 
    username,
    full_name,
    email,
    profile_picture_url,
    updated_at
FROM user_profiles 
WHERE user_id = $1;

-- 7. UPDATE PROFILE PICTURE WITH VALIDATION
-- Update profile picture with size and type validation
UPDATE user_profiles 
SET 
    profile_picture_url = CASE 
        WHEN LENGTH($1) > 10000000 THEN NULL  -- Reject if larger than 10MB
        WHEN $1 NOT LIKE 'data:image/%' AND $1 NOT LIKE 'http%' THEN NULL  -- Reject if not image data or URL
        ELSE $1
    END,
    updated_at = NOW()
WHERE user_id = $2;

-- 8. BULK UPDATE PROFILE PICTURES
-- Update profile pictures for multiple users
UPDATE user_profiles 
SET 
    profile_picture_url = $1,
    updated_at = NOW()
WHERE user_id = ANY($2);  -- $2 is an array of user IDs

-- Example:
-- UPDATE user_profiles 
-- SET 
--     profile_picture_url = 'https://myapp.com/default-avatar.jpg',
--     updated_at = NOW()
-- WHERE user_id = ANY(ARRAY['user1', 'user2', 'user3']);

-- 9. GET USERS WITHOUT PROFILE PICTURES
-- Find users who don't have profile pictures set
SELECT 
    user_id,
    username,
    full_name,
    email,
    created_at
FROM user_profiles 
WHERE profile_picture_url IS NULL 
   OR profile_picture_url = '';

-- 10. COUNT PROFILE PICTURE STATISTICS
-- Get statistics about profile picture usage
SELECT 
    COUNT(*) as total_users,
    COUNT(profile_picture_url) as users_with_pictures,
    COUNT(*) - COUNT(profile_picture_url) as users_without_pictures,
    ROUND(
        (COUNT(profile_picture_url)::decimal / COUNT(*)) * 100, 2
    ) as percentage_with_pictures
FROM user_profiles;

-- 11. GET PROFILE PICTURE BY TYPE
-- Separate base64 and URL profile pictures
SELECT 
    user_id,
    username,
    CASE 
        WHEN profile_picture_url LIKE 'data:image/%' THEN 'base64'
        WHEN profile_picture_url LIKE 'http%' THEN 'url'
        ELSE 'none'
    END as picture_type,
    LENGTH(profile_picture_url) as picture_size
FROM user_profiles 
WHERE profile_picture_url IS NOT NULL;

-- 12. CLEANUP OLD PROFILE PICTURES
-- Remove profile pictures that haven't been updated in a year
UPDATE user_profiles 
SET 
    profile_picture_url = NULL,
    updated_at = NOW()
WHERE profile_picture_url IS NOT NULL 
  AND updated_at < NOW() - INTERVAL '1 year';

-- 13. BACKUP PROFILE PICTURES
-- Create a backup of profile pictures before cleanup
CREATE TABLE IF NOT EXISTS profile_picture_backup AS
SELECT 
    user_id,
    profile_picture_url,
    updated_at,
    NOW() as backup_date
FROM user_profiles 
WHERE profile_picture_url IS NOT NULL;

-- 14. RESTORE PROFILE PICTURES FROM BACKUP
-- Restore profile pictures from backup table
UPDATE user_profiles 
SET 
    profile_picture_url = backup.profile_picture_url,
    updated_at = NOW()
FROM profile_picture_backup backup
WHERE user_profiles.user_id = backup.user_id
  AND user_profiles.profile_picture_url IS NULL;

-- 15. PROFILE PICTURE SIZE ANALYSIS
-- Analyze the size of stored profile pictures
SELECT 
    CASE 
        WHEN LENGTH(profile_picture_url) < 1000 THEN 'Small (<1KB)'
        WHEN LENGTH(profile_picture_url) < 10000 THEN 'Medium (1-10KB)'
        WHEN LENGTH(profile_picture_url) < 100000 THEN 'Large (10-100KB)'
        WHEN LENGTH(profile_picture_url) < 1000000 THEN 'Very Large (100KB-1MB)'
        ELSE 'Huge (>1MB)'
    END as size_category,
    COUNT(*) as count
FROM user_profiles 
WHERE profile_picture_url IS NOT NULL
GROUP BY 
    CASE 
        WHEN LENGTH(profile_picture_url) < 1000 THEN 'Small (<1KB)'
        WHEN LENGTH(profile_picture_url) < 10000 THEN 'Medium (1-10KB)'
        WHEN LENGTH(profile_picture_url) < 100000 THEN 'Large (10-100KB)'
        WHEN LENGTH(profile_picture_url) < 1000000 THEN 'Very Large (100KB-1MB)'
        ELSE 'Huge (>1MB)'
    END
ORDER BY count DESC;



