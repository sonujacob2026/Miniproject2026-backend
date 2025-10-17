const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Supabase client is initialized via config/supabase

// Validation middleware
const validateCategoryType = (req, res, next) => {
  const { type_name, description } = req.body;
  
  if (!type_name || typeof type_name !== 'string' || type_name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Type name is required and must be a non-empty string'
    });
  }
  
  if (type_name.trim().length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Type name must be 50 characters or less'
    });
  }
  
  // Validate that type_name contains only characters (letters, spaces, hyphens, apostrophes)
  const trimmedName = type_name.trim();
  const characterOnlyRegex = /^[a-zA-Z\s\-']+$/;
  
  if (!characterOnlyRegex.test(trimmedName)) {
    return res.status(400).json({
      success: false,
      message: 'Type name must contain only letters, spaces, hyphens, and apostrophes'
    });
  }
  
  if (description && typeof description !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Description must be a string'
    });
  }
  
  if (description && description.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Description must be 200 characters or less'
    });
  }
  
  req.body.type_name = trimmedName;
  req.body.description = description ? description.trim() : null;
  next();
};

// GET /api/category-types - Get all category types
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('category_types')
      .select('*')
      .order('type_name', { ascending: true });

    if (error) {
      console.error('Error fetching category types:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch category types'
      });
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error in category types route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/category-types - Create a new category type
router.post('/', validateCategoryType, async (req, res) => {
  try {
    const { type_name, description } = req.body;

    // Check if category type already exists
    const { data: existingType } = await supabase
      .from('category_types')
      .select('id')
      .eq('type_name', type_name)
      .single();

    if (existingType) {
      return res.status(409).json({
        success: false,
        message: 'Category type with this name already exists'
      });
    }

    const { data, error } = await supabase
      .from('category_types')
      .insert({ 
        type_name, 
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category type:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create category type'
      });
    }

    // Also create default categories linked to this type (best-effort)
    try {
      if (data?.id) {
        // Create a default expense category
        await supabase
          .from('expense_categories')
          .insert({
            category: type_name,
            icon: '🏷️',
            subcategories: [],
            category_type_id: data.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        // Create a default income category
        await supabase
          .from('income_categories')
          .insert({
            name: type_name,
            category_type_id: data.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (seedErr) {
      // Log only; do not fail the main creation
      console.warn('Warning: failed to seed default categories for type:', seedErr);
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Category type created successfully'
    });
  } catch (error) {
    console.error('Error in create category type route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/category-types/:id - Update a category type
router.put('/:id', validateCategoryType, async (req, res) => {
  try {
    const { id } = req.params;
    const { type_name, description } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category type ID is required'
      });
    }

    // Check if category type exists
    const { data: existingType } = await supabase
      .from('category_types')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingType) {
      return res.status(404).json({
        success: false,
        message: 'Category type not found'
      });
    }

    // Check if another category type with the same name exists
    const { data: duplicateType } = await supabase
      .from('category_types')
      .select('id')
      .eq('type_name', type_name)
      .neq('id', id)
      .single();

    if (duplicateType) {
      return res.status(409).json({
        success: false,
        message: 'Category type with this name already exists'
      });
    }

    const { data, error } = await supabase
      .from('category_types')
      .update({ 
        type_name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category type:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update category type'
      });
    }

    res.json({
      success: true,
      data,
      message: 'Category type updated successfully'
    });
  } catch (error) {
    console.error('Error in update category type route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/category-types/:id - Delete a category type
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category type ID is required'
      });
    }

    // Check if category type exists
    const { data: existingType } = await supabase
      .from('category_types')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingType) {
      return res.status(404).json({
        success: false,
        message: 'Category type not found'
      });
    }

    // Check if this category type is being used by any categories
    const { data: categoriesUsingType } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('category_type_id', id)
      .limit(1);

    if (categoriesUsingType && categoriesUsingType.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete category type that is being used by expense categories'
      });
    }

    // Check income categories as well
    const { data: incomeCategoriesUsingType } = await supabase
      .from('income_categories')
      .select('id')
      .eq('category_type_id', id)
      .limit(1);

    if (incomeCategoriesUsingType && incomeCategoriesUsingType.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete category type that is being used by income categories'
      });
    }

    // Delete the category type
    const { error } = await supabase
      .from('category_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category type:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete category type'
      });
    }

    res.json({
      success: true,
      message: 'Category type deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete category type route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;

