const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
} else {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Update admin password endpoint
  router.post('/update-admin-password', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Hash the password
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(password).digest('hex');

      // Update or insert admin password in user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          email: email,
          password: hash,
          password_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (error) {
        console.error('Error updating admin password:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update admin password in database'
        });
      }

      res.json({
        success: true,
        message: 'Admin password updated successfully'
      });

    } catch (error) {
      console.error('Error in update-admin-password:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get admin password info endpoint
  router.get('/admin-password-info/:email', async (req, res) => {
    try {
      const { email } = req.params;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('email, password_updated_at')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin password info:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch admin password info'
        });
      }

      res.json({
        success: true,
        data: data || null
      });

    } catch (error) {
      console.error('Error in admin-password-info:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
}

module.exports = router;
