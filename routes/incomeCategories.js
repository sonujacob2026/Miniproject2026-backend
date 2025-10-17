const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validation middleware
const validateIncomeCategory = (req, res, next) => {
  const { name } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Category name is required and must be a non-empty string'
    });
  }
  
  if (name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Category name must be 100 characters or less'
    });
  }
  
  req.body.name = name.trim();
  next();
};

const validateIncomeSubcategory = (req, res, next) => {
  const { category_id, name, is_recurring } = req.body;
  
  if (!category_id || typeof category_id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Category ID is required and must be a valid UUID'
    });
  }
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Subcategory name is required and must be a non-empty string'
    });
  }
  
  if (name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Subcategory name must be 100 characters or less'
    });
  }
  
  if (typeof is_recurring !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'is_recurring must be a boolean value'
    });
  }
  
  req.body.name = name.trim();
  next();
};

// GET /api/income-categories - Get all income categories
router.get('/income-categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('income_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching income categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch income categories'
      });
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error in income categories route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/income-categories/:id/subcategories - Get subcategories for a specific category
router.get('/income-categories/:id/subcategories', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    const { data, error } = await supabase
      .from('income_subcategories')
      .select(`
        *,
        income_categories (
          id,
          name
        )
      `)
      .eq('category_id', id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching income subcategories:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch income subcategories'
      });
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error in income subcategories route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/income-categories - Create a new income category
router.post('/income-categories', validateIncomeCategory, async (req, res) => {
  try {
    const { name } = req.body;

    // Check if category already exists
    const { data: existingCategory } = await supabase
      .from('income_categories')
      .select('id')
      .eq('name', name)
      .single();

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Income category with this name already exists'
      });
    }

    const { data, error } = await supabase
      .from('income_categories')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('Error creating income category:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create income category'
      });
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Income category created successfully'
    });
  } catch (error) {
    console.error('Error in create income category route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/income-subcategories - Create a new income subcategory
router.post('/income-subcategories', validateIncomeSubcategory, async (req, res) => {
  try {
    const { category_id, name, is_recurring } = req.body;

    // Check if category exists
    const { data: category } = await supabase
      .from('income_categories')
      .select('id')
      .eq('id', category_id)
      .single();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Income category not found'
      });
    }

    // Check if subcategory already exists for this category
    const { data: existingSubcategory } = await supabase
      .from('income_subcategories')
      .select('id')
      .eq('category_id', category_id)
      .eq('name', name)
      .single();

    if (existingSubcategory) {
      return res.status(409).json({
        success: false,
        message: 'Income subcategory with this name already exists for this category'
      });
    }

    const { data, error } = await supabase
      .from('income_subcategories')
      .insert({ 
        category_id, 
        name, 
        is_recurring 
      })
      .select(`
        *,
        income_categories (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating income subcategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create income subcategory'
      });
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Income subcategory created successfully'
    });
  } catch (error) {
    console.error('Error in create income subcategory route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/income-categories/:id - Update an income category
router.put('/income-categories/:id', validateIncomeCategory, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    // Check if category exists
    const { data: existingCategory } = await supabase
      .from('income_categories')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Income category not found'
      });
    }

    // Check if another category with the same name exists
    const { data: duplicateCategory } = await supabase
      .from('income_categories')
      .select('id')
      .eq('name', name)
      .neq('id', id)
      .single();

    if (duplicateCategory) {
      return res.status(409).json({
        success: false,
        message: 'Income category with this name already exists'
      });
    }

    const { data, error } = await supabase
      .from('income_categories')
      .update({ 
        name,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating income category:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update income category'
      });
    }

    res.json({
      success: true,
      data,
      message: 'Income category updated successfully'
    });
  } catch (error) {
    console.error('Error in update income category route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/income-subcategories/:id - Update an income subcategory
router.put('/income-subcategories/:id', validateIncomeSubcategory, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, is_recurring } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory ID is required'
      });
    }

    // Check if subcategory exists
    const { data: existingSubcategory } = await supabase
      .from('income_subcategories')
      .select('id, category_id')
      .eq('id', id)
      .single();

    if (!existingSubcategory) {
      return res.status(404).json({
        success: false,
        message: 'Income subcategory not found'
      });
    }

    // Check if category exists
    const { data: category } = await supabase
      .from('income_categories')
      .select('id')
      .eq('id', category_id)
      .single();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Income category not found'
      });
    }

    // Check if another subcategory with the same name exists for this category
    const { data: duplicateSubcategory } = await supabase
      .from('income_subcategories')
      .select('id')
      .eq('category_id', category_id)
      .eq('name', name)
      .neq('id', id)
      .single();

    if (duplicateSubcategory) {
      return res.status(409).json({
        success: false,
        message: 'Income subcategory with this name already exists for this category'
      });
    }

    const { data, error } = await supabase
      .from('income_subcategories')
      .update({ 
        category_id,
        name,
        is_recurring,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        income_categories (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating income subcategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update income subcategory'
      });
    }

    res.json({
      success: true,
      data,
      message: 'Income subcategory updated successfully'
    });
  } catch (error) {
    console.error('Error in update income subcategory route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/income-categories/:id - Delete an income category
router.delete('/income-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    // Check if category exists
    const { data: existingCategory } = await supabase
      .from('income_categories')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Income category not found'
      });
    }

    // Delete the category (subcategories will be deleted due to CASCADE)
    const { error } = await supabase
      .from('income_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting income category:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete income category'
      });
    }

    res.json({
      success: true,
      message: 'Income category deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete income category route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/income-subcategories/:id - Delete an income subcategory
router.delete('/income-subcategories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory ID is required'
      });
    }

    // Check if subcategory exists
    const { data: existingSubcategory } = await supabase
      .from('income_subcategories')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingSubcategory) {
      return res.status(404).json({
        success: false,
        message: 'Income subcategory not found'
      });
    }

    // Delete the subcategory
    const { error } = await supabase
      .from('income_subcategories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting income subcategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete income subcategory'
      });
    }

    res.json({
      success: true,
      message: 'Income subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete income subcategory route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;

