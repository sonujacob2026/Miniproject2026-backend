// Supabase Profile Management Examples
// These examples show how to update user profiles using Supabase client

import { supabase } from './lib/supabase'; // Adjust path to your supabase client

// =====================================================
// 1. UPDATE PROFILE PICTURE
// =====================================================

// Update profile picture with base64 encoded image
export const updateProfilePicture = async (userId, base64Image) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        profile_picture_url: base64Image,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error updating profile picture:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception updating profile picture:', error);
    return { success: false, error: error.message };
  }
};

// Remove profile picture
export const removeProfilePicture = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        profile_picture_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error removing profile picture:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception removing profile picture:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// 2. UPDATE BASIC PROFILE INFORMATION
// =====================================================

// Update basic profile fields
export const updateBasicProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name: profileData.full_name,
        username: profileData.username,
        monthly_income: profileData.monthly_income,
        household_members: profileData.household_members,
        savings_goal: profileData.savings_goal,
        budgeting_experience: profileData.budgeting_experience,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error updating basic profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception updating basic profile:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// 3. UPDATE FINANCIAL GOALS
// =====================================================

// Update financial goals array
export const updateFinancialGoals = async (userId, goals) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        financial_goals: goals, // Array of goals
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error updating financial goals:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception updating financial goals:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// 4. UPDATE PRIMARY EXPENSES
// =====================================================

// Update primary expenses array
export const updatePrimaryExpenses = async (userId, expenses) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        primary_expenses: expenses, // Array of expense categories
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error updating primary expenses:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception updating primary expenses:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// 5. COMPREHENSIVE PROFILE UPDATE
// =====================================================

// Update multiple profile fields at once
export const updateCompleteProfile = async (userId, profileData) => {
  try {
    const updateData = {
      full_name: profileData.full_name,
      username: profileData.username,
      profile_picture_url: profileData.profile_picture_url,
      monthly_income: profileData.monthly_income,
      household_members: profileData.household_members,
      has_debt: profileData.has_debt,
      debt_amount: profileData.debt_amount,
      savings_goal: profileData.savings_goal,
      primary_expenses: profileData.primary_expenses,
      budgeting_experience: profileData.budgeting_experience,
      financial_goals: profileData.financial_goals,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error updating complete profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception updating complete profile:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// 6. UPSERT PROFILE (INSERT OR UPDATE)
// =====================================================

// Insert or update profile (useful for new users)
export const upsertProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        username: profileData.username,
        full_name: profileData.full_name,
        email: profileData.email,
        profile_picture_url: profileData.profile_picture_url,
        monthly_income: profileData.monthly_income,
        household_members: profileData.household_members,
        has_debt: profileData.has_debt,
        debt_amount: profileData.debt_amount,
        savings_goal: profileData.savings_goal,
        primary_expenses: profileData.primary_expenses,
        budgeting_experience: profileData.budgeting_experience,
        financial_goals: profileData.financial_goals,
        onboarding_completed: profileData.onboarding_completed || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) {
      console.error('Error upserting profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception upserting profile:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// 7. GET PROFILE INFORMATION
// =====================================================

// Get complete profile information
export const getProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data };
  } catch (error) {
    console.error('Exception getting profile:', error);
    return { success: false, error: error.message };
  }
};

// Get profile picture only
export const getProfilePicture = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('profile_picture_url')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting profile picture:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data.profile_picture_url };
  } catch (error) {
    console.error('Exception getting profile picture:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// 8. VALIDATION FUNCTIONS
// =====================================================

// Check username availability
export const checkUsernameAvailability = async (username) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error checking username availability:', error);
      return { success: false, error: error.message };
    }

    return { success: true, available: !data };
  } catch (error) {
    console.error('Exception checking username availability:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// 9. USAGE EXAMPLES
// =====================================================

// Example: Update profile picture from file upload
export const handleImageUpload = async (userId, file) => {
  // Convert file to base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64String = e.target.result;
    const result = await updateProfilePicture(userId, base64String);
    
    if (result.success) {
      console.log('Profile picture updated successfully');
    } else {
      console.error('Failed to update profile picture:', result.error);
    }
  };
  reader.readAsDataURL(file);
};

// Example: Update complete profile
export const handleProfileUpdate = async (userId, formData) => {
  const profileData = {
    full_name: formData.fullName,
    username: formData.username,
    monthly_income: parseFloat(formData.monthlyIncome),
    household_members: parseInt(formData.householdMembers),
    savings_goal: formData.savingsGoal,
    budgeting_experience: formData.budgetingExperience,
    financial_goals: formData.financialGoals || [],
    primary_expenses: formData.primaryExpenses || []
  };

  const result = await updateCompleteProfile(userId, profileData);
  
  if (result.success) {
    console.log('Profile updated successfully:', result.data);
    return result;
  } else {
    console.error('Failed to update profile:', result.error);
    return result;
  }
};

// Example: Create new user profile
export const createUserProfile = async (userId, userData) => {
  const profileData = {
    username: userData.username,
    full_name: userData.fullName,
    email: userData.email,
    onboarding_completed: false,
    monthly_income: null,
    household_members: null,
    has_debt: null,
    debt_amount: null,
    savings_goal: null,
    primary_expenses: [],
    budgeting_experience: null,
    financial_goals: []
  };

  const result = await upsertProfile(userId, profileData);
  
  if (result.success) {
    console.log('User profile created successfully');
  } else {
    console.error('Failed to create user profile:', result.error);
  }
  
  return result;
};







