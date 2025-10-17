import { supabase } from '../config/supabase.js';

/**
 * Service for managing expense categories and subcategories
 */
class ExpenseCategoriesService {
  /**
   * Fetch all expense categories from the database
   * @returns {Promise<Array>} Array of category objects
   */
  async getAllCategories() {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (error) {
        console.error('Error fetching expense categories:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getAllCategories:', error);
      throw error;
    }
  }

  /**
   * Get subcategories for a specific category
   * @param {string} categoryName - Name of the category
   * @returns {Promise<Array>} Array of subcategory objects
   */
  async getSubcategories(categoryName) {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('subcategories')
        .eq('category', categoryName)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching subcategories:', error);
        return [];
      }

      return data?.subcategories || [];
    } catch (error) {
      console.error('Exception in getSubcategories:', error);
      return [];
    }
  }

  /**
   * Add a new expense category
   * @param {Object} categoryData - Category data
   * @param {string} categoryData.category - Category name
   * @param {string} categoryData.icon - Category icon
   * @param {Array} categoryData.subcategories - Array of subcategories
   * @returns {Promise<Object>} Created category object
   */
  async addCategory(categoryData) {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([categoryData])
        .select()
        .single();

      if (error) {
        console.error('Error adding category:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Exception in addCategory:', error);
      throw error;
    }
  }

  /**
   * Update an existing expense category
   * @param {string} categoryId - Category ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated category object
   */
  async updateCategory(categoryId, updateData) {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .update(updateData)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) {
        console.error('Error updating category:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Exception in updateCategory:', error);
      throw error;
    }
  }

  /**
   * Delete an expense category (soft delete by setting is_active to false)
   * @param {string} categoryId - Category ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCategory(categoryId) {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: false })
        .eq('id', categoryId);

      if (error) {
        console.error('Error deleting category:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Exception in deleteCategory:', error);
      throw error;
    }
  }

  /**
   * Add a subcategory to an existing category
   * @param {string} categoryId - Category ID
   * @param {Object} subcategoryData - Subcategory data
   * @returns {Promise<Object>} Updated category object
   */
  async addSubcategory(categoryId, subcategoryData) {
    try {
      // First get the current category
      const { data: category, error: fetchError } = await supabase
        .from('expense_categories')
        .select('subcategories')
        .eq('id', categoryId)
        .single();

      if (fetchError) {
        console.error('Error fetching category for subcategory addition:', fetchError);
        throw fetchError;
      }

      // Add new subcategory to the array
      const updatedSubcategories = [...(category.subcategories || []), subcategoryData];

      // Update the category
      const { data, error } = await supabase
        .from('expense_categories')
        .update({ subcategories: updatedSubcategories })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) {
        console.error('Error adding subcategory:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Exception in addSubcategory:', error);
      throw error;
    }
  }

  /**
   * Update a subcategory in an existing category
   * @param {string} categoryId - Category ID
   * @param {string} subcategoryName - Name of the subcategory to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated category object
   */
  async updateSubcategory(categoryId, subcategoryName, updateData) {
    try {
      // First get the current category
      const { data: category, error: fetchError } = await supabase
        .from('expense_categories')
        .select('subcategories')
        .eq('id', categoryId)
        .single();

      if (fetchError) {
        console.error('Error fetching category for subcategory update:', fetchError);
        throw fetchError;
      }

      // Update the specific subcategory
      const updatedSubcategories = (category.subcategories || []).map(sub => 
        sub.name === subcategoryName ? { ...sub, ...updateData } : sub
      );

      // Update the category
      const { data, error } = await supabase
        .from('expense_categories')
        .update({ subcategories: updatedSubcategories })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) {
        console.error('Error updating subcategory:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Exception in updateSubcategory:', error);
      throw error;
    }
  }

  /**
   * Delete a subcategory from an existing category
   * @param {string} categoryId - Category ID
   * @param {string} subcategoryName - Name of the subcategory to delete
   * @returns {Promise<Object>} Updated category object
   */
  async deleteSubcategory(categoryId, subcategoryName) {
    try {
      // First get the current category
      const { data: category, error: fetchError } = await supabase
        .from('expense_categories')
        .select('subcategories')
        .eq('id', categoryId)
        .single();

      if (fetchError) {
        console.error('Error fetching category for subcategory deletion:', fetchError);
        throw fetchError;
      }

      // Remove the specific subcategory
      const updatedSubcategories = (category.subcategories || []).filter(
        sub => sub.name !== subcategoryName
      );

      // Update the category
      const { data, error } = await supabase
        .from('expense_categories')
        .update({ subcategories: updatedSubcategories })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) {
        console.error('Error deleting subcategory:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Exception in deleteSubcategory:', error);
      throw error;
    }
  }
}

export default new ExpenseCategoriesService();