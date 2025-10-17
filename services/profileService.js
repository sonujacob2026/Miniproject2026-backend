// Profile service aligned with Supabase 'user_profiles' schema
// Maps questionnaire form data to normalized DB columns and vice versa.

import { supabase } from '../lib/supabase';

const table = 'user_profiles';

// Helper: convert questionnaire form data -> DB row
function mapFormToRow(formData, userId, { setOnboarding = false } = {}) {
  const toNumber = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    user_id: userId,
    household_members: formData.householdMembers ? parseInt(formData.householdMembers, 10) : null,
    monthly_income: toNumber(formData.monthlyIncome),
    has_debt: formData.hasDebt === 'yes' ? true : formData.hasDebt === 'no' ? false : null,
    debt_amount: toNumber(formData.debtAmount),
    savings_goal: formData.savingsGoal ?? null,
    primary_expenses: Array.isArray(formData.primaryExpenses) ? formData.primaryExpenses : [],
    budgeting_experience: formData.budgetingExperience ?? null,
    financial_goals: Array.isArray(formData.financialGoals) ? formData.financialGoals : [],
    ...(setOnboarding ? { onboarding_completed: true } : {}),
  };
}

// Helper: DB row -> questionnaire-friendly object
function mapRowToForm(row) {
  if (!row) return null;
  return {
    // For Questionnaire
    householdMembers: row.household_members != null ? String(row.household_members) : '',
    monthlyIncome: row.monthly_income != null ? String(row.monthly_income) : '',
    hasDebt: row.has_debt === true ? 'yes' : row.has_debt === false ? 'no' : '',
    debtAmount: row.debt_amount != null ? String(row.debt_amount) : '',
    savingsGoal: row.savings_goal ?? '',
    primaryExpenses: row.primary_expenses ?? [],
    budgetingExperience: row.budgeting_experience ?? '',
    financialGoals: row.financial_goals ?? [],
    // For UserProfile
    full_name: row.full_name ?? '',
    email: row.email ?? '',
    profile_picture_url: row.profile_picture_url ?? '',
  };
}

// Helper: convert profile form data -> DB row
function mapProfileFormToRow(formData, userId) {
  const toNumber = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    user_id: userId,
    full_name: formData.full_name || null,
    email: formData.email || null,
    household_members: formData.household_members ? parseInt(formData.household_members, 10) : null,
    monthly_income: toNumber(formData.monthly_income),
    has_debt: formData.has_debt === 'yes' ? true : formData.has_debt === 'no' ? false : null,
    debt_amount: toNumber(formData.debt_amount),
    savings_goal: formData.savings_goal || null,
    budgeting_experience: formData.budgeting_experience || null,
    financial_goals: Array.isArray(formData.financial_goals) ? formData.financial_goals : [],
    profile_picture_url: formData.profile_picture_url || null,
  };
}

const ProfileService = {
  // Cache for profile data to avoid repeated queries
  _profileCache: new Map(),
  _cacheTimeout: 5 * 60 * 1000, // 5 minutes

  // Get raw profile row for a user with caching and fast timeout
  async getProfile(userId) {
    const startTime = performance.now();
    
    try {
      // Check cache first
      const cacheKey = `profile_${userId}`;
      const cached = this._profileCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
        console.log('ProfileService: Using cached profile for user:', userId);
        return { success: true, data: cached.data };
      }

      console.log('ProfileService: Getting profile for user:', userId);
      
      // Create a timeout promise (increase to 5 seconds to avoid premature timeout)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );
      
      // Try simple user_id query with timeout
      const queryPromise = supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('ProfileService: Error getting profile:', error);
        return { success: false, error: error.message };
      }

      let row = data || null;
      
      // Cache the result if found
      if (row) {
        this._profileCache.set(cacheKey, {
          data: row,
          timestamp: Date.now()
        });
      }

      const loadTime = performance.now() - startTime;
      console.log(`ProfileService: Profile loaded in ${loadTime.toFixed(2)}ms`);
      console.log('ProfileService: Profile data:', row);
      
      return { success: true, data: row || null };
    } catch (err) {
      console.error('ProfileService: Exception getting profile:', err);
      return { success: false, error: err.message };
    }
  },

  // Clear cache for a specific user
  clearCache(userId) {
    const cacheKey = `profile_${userId}`;
    this._profileCache.delete(cacheKey);
  },

  // Clear all cache
  clearAllCache() {
    this._profileCache.clear();
  },

  // Save entire profile (used by questionnaire completion)
  async saveProfile(formData, userId) {
    try {
      const timings = {};
      let t0 = performance.now();
      const row = mapFormToRow(formData, userId, { setOnboarding: true });
      const now = new Date().toISOString();

      // Ensure we include email if the table enforces NOT NULL on email
      let userEmail = null;
      try {
        const t1 = performance.now();
        const { data: userData } = await supabase.auth.getUser();
        timings.getUser = performance.now() - t1;
        userEmail = userData?.user?.email || null;
      } catch (_) {}

      // Try update first
      const t2 = performance.now();
      const { data: updated, error: updateErr } = await supabase
        .from(table)
        .update({ ...row, ...(userEmail ? { email: userEmail } : {}), updated_at: now })
        .eq('user_id', userId)
        .select()
        .maybeSingle();
      timings.update = performance.now() - t2;

      if (!updateErr && updated) {
        console.log('[ProfileService] Timings:', timings);
        return { success: true, data: updated };
      }

      // If no row existed, insert
      const t3 = performance.now();
      const { data: inserted, error: insertErr } = await supabase
        .from(table)
        .insert({ ...row, ...(userEmail ? { email: userEmail } : {}), created_at: now, updated_at: now })
        .select()
        .single();
      timings.insert = performance.now() - t3;

      console.log('[ProfileService] Timings:', timings);
      if (insertErr) return { success: false, error: insertErr.message };
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Update specific fields on the profile row
  async updateProfile(userId, updates) {
    try {
      console.log('ProfileService: Updating profile for user:', userId, 'updates:', updates);
      const now = new Date().toISOString();
      
      // Convert updates to proper format
      const formattedUpdates = {
        ...updates,
        updated_at: now
      };
      
      // Handle debt fields properly
      if (updates.has_debt !== undefined) {
        formattedUpdates.has_debt = updates.has_debt === 'yes' ? true : updates.has_debt === 'no' ? false : null;
      }
      
      const { data, error } = await supabase
        .from(table)
        .update(formattedUpdates)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('ProfileService: Error updating profile:', error);
        return { success: false, error: error.message };
      }
      
      // Clear cache to ensure fresh data
      this.clearCache(userId);
      
      console.log('ProfileService: Profile updated successfully:', data);
      return { success: true, data };
    } catch (err) {
      console.error('ProfileService: Exception updating profile:', err);
      return { success: false, error: err.message };
    }
  },

  // Update profile picture specifically
  async updateProfilePicture(userId, profilePictureUrl) {
    try {
      console.log('ProfileService: Updating profile picture for user:', userId);
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from(table)
        .update({ 
          profile_picture_url: profilePictureUrl,
          updated_at: now 
        })
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('ProfileService: Error updating profile picture:', error);
        return { success: false, error: error.message };
      }
      
      console.log('ProfileService: Profile picture updated successfully');
      return { success: true, data };
    } catch (err) {
      console.error('ProfileService: Exception updating profile picture:', err);
      return { success: false, error: err.message };
    }
  },

  // Remove profile picture
  async removeProfilePicture(userId) {
    try {
      console.log('ProfileService: Removing profile picture for user:', userId);
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from(table)
        .update({ 
          profile_picture_url: null,
          updated_at: now 
        })
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('ProfileService: Error removing profile picture:', error);
        return { success: false, error: error.message };
      }
      
      console.log('ProfileService: Profile picture removed successfully');
      return { success: true, data };
    } catch (err) {
      console.error('ProfileService: Exception removing profile picture:', err);
      return { success: false, error: err.message };
    }
  },

  // Check username availability
  async checkUsernameAvailability(username) {
    try {
      console.log('ProfileService: Checking username availability:', username);
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.error('ProfileService: Error checking username availability:', error);
        return { success: false, error: error.message };
      }
      
      const available = !data;
      console.log('ProfileService: Username available:', available);
      return { success: true, available };
    } catch (err) {
      console.error('ProfileService: Exception checking username availability:', err);
      return { success: false, error: err.message };
    }
  },

  // Return questionnaire-friendly data assembled from columns
  async getFormattedProfile(userId) {
    const res = await this.getProfile(userId);
    if (!res.success) return res;
    if (!res.data) return { success: true, data: null };
    return { success: true, data: mapRowToForm(res.data) };
  },

  // Return onboarding completion status
  async getOnboardingStatus(userId) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('onboarding_completed')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      return { success: true, completed: !!data?.onboarding_completed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Save entire profile form data
  async saveProfileForm(formData, userId) {
    try {
      console.log('ProfileService: Saving profile form for user:', userId);
      const row = mapProfileFormToRow(formData, userId);
      const now = new Date().toISOString();

      // Try update first
      const { data: updated, error: updateErr } = await supabase
        .from(table)
        .update({ ...row, updated_at: now })
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (!updateErr && updated) {
        this.clearCache(userId);
        return { success: true, data: updated };
      }

      // If no row existed, insert
      const { data: inserted, error: insertErr } = await supabase
        .from(table)
        .insert({ ...row, created_at: now, updated_at: now })
        .select()
        .single();

      if (insertErr) return { success: false, error: insertErr.message };
      this.clearCache(userId);
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

export default ProfileService;