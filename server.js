const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Import routes
const incomeCategoriesRoutes = require('./routes/incomeCategories');
const categoryTypeRoutes = require('./routes/categoryTypes');
const ocrRoutes = require('./routes/ocrRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api', incomeCategoriesRoutes);
// Mount category types router at the expected base path used by the frontend
app.use('/api/category-types', categoryTypeRoutes);
// Mount OCR routes for receipt processing
app.use('/api/ocr', ocrRoutes);

// Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  res.sendStatus(200);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ExpenseAI Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Supabase connectivity health check
app.get('/health/supabase', async (req, res) => {
  try {
    // Run a very light check: select 1 via an inexpensive table
    // Prefer a table that always exists in this project: user_profiles
    const { data, error, count } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return res.status(500).json({
        status: 'ERROR',
        message: 'Supabase query failed',
        error
      });
    }

    return res.json({
      status: 'OK',
      message: 'Supabase reachable and responding',
      table: 'user_profiles',
      approxCount: typeof count === 'number' ? count : null,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({
      status: 'ERROR',
      message: 'Supabase connectivity check exception',
      error: e?.message || String(e)
    });
  }
});

// JWT Authentication middleware
const jwtAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1]; // Expect Bearer token
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

// Protect payment routes with JWT auth middleware
app.post('/api/payments/create-order', jwtAuthMiddleware, async (req, res) => {
  try {
    const { amount, currency = 'INR', userId, expenseId, description } = req.body;

    if (!amount || !userId) {
      return res.status(400).json({ success: false, message: 'amount and userId are required' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // in paise
      currency,
      receipt: `exp-${expenseId || 'na'}-${Date.now()}`,
      notes: { userId, expenseId, description }
    });

    // Record created order in payments table
    await supabase.from('payments').insert({
      user_id: userId,
      expense_id: expenseId || null,
      amount: amount,
      currency: currency,
      status: 'created',
      razorpay_order_id: order.id,
      notes: order.notes || {}
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Verify payment signature
app.post('/api/payments/verify', jwtAuthMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const valid = expected === razorpay_signature;

    if (!valid) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          razorpay_payment_id,
          razorpay_signature
        })
        .eq('razorpay_order_id', razorpay_order_id);
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const { data: updated, error } = await supabase
      .from('payments')
      .update({
        status: 'captured',
        razorpay_payment_id,
        razorpay_signature,
        verified_at: new Date().toISOString()
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .select()
      .single();

    if (error) {
      console.error('payments update error:', error);
    }

    res.json({ success: true, payment: updated });
  } catch (err) {
    console.error('verify error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// Create Razorpay Order
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', userId, expenseId, description } = req.body;
    if (!amount || !userId) {
      return res.status(400).json({ success: false, message: 'amount and userId are required' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // in paise
      currency,
      receipt: `exp-${expenseId || 'na'}-${Date.now()}`,
      notes: { userId, expenseId, description }
    });

    // Record created order in payments table
    await supabase.from('payments').insert({
      user_id: userId,
      expense_id: expenseId || null,
      amount: amount,
      currency: currency,
      status: 'created',
      razorpay_order_id: order.id,
      notes: order.notes || {}
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Verify payment signature
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const valid = expected === razorpay_signature;

    if (!valid) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          razorpay_payment_id,
          razorpay_signature
        })
        .eq('razorpay_order_id', razorpay_order_id);
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const { data: updated, error } = await supabase
      .from('payments')
      .update({
        status: 'captured',
        razorpay_payment_id,
        razorpay_signature,
        verified_at: new Date().toISOString()
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .select()
      .single();

    if (error) {
      console.error('payments update error:', error);
    }

    res.json({ success: true, payment: updated });
  } catch (err) {
    console.error('verify error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// Optional: Webhook handler
app.post('/api/payments/webhook', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return res.sendStatus(200);

    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

    if (signature !== expected) return res.sendStatus(400);

    const event = req.body?.event;
    const payload = req.body?.payload || {};
    const orderId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id;

    if (event === 'payment.captured' && orderId) {
      await supabase
        .from('payments')
        .update({
          status: 'captured',
          razorpay_payment_id: payload.payment.entity.id,
          method: payload.payment.entity.method,
          email: payload.payment.entity.email,
          contact: payload.payment.entity.contact,
          verified_at: new Date().toISOString()
        })
        .eq('razorpay_order_id', orderId);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('webhook error', e);
    res.sendStatus(500);
  }
});









// Google OAuth Sign-In endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    console.log('📨 Received Google OAuth request:', req.body);
    const { credential } = req.body;

    if (!credential) {
      console.log('❌ No credential provided');
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    console.log('🔐 Verifying Google token...');
    console.log('🔑 Using Client ID:', process.env.GOOGLE_CLIENT_ID);

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('✅ Google token verified for:', payload.email);

    // Extract user information
    const googleUser = {
      googleId: payload.sub,
      email: payload.email,
      fullName: payload.name,
      firstName: payload.given_name,
      lastName: payload.family_name,
      picture: payload.picture,
      emailVerified: payload.email_verified
    };

    // Check if user exists in database
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', googleUser.email)
      .single();

    let user;

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: googleUser.fullName,
          picture_url: googleUser.picture,
          provider: 'google',
          google_id: googleUser.googleId,
          updated_at: new Date().toISOString()
        })
        .eq('email', googleUser.email)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update user profile'
        });
      }

      user = updatedUser;
      console.log('✅ User updated:', user.email);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          email: googleUser.email,
          full_name: googleUser.fullName,
          picture_url: googleUser.picture,
          provider: 'google',
          google_id: googleUser.googleId,
          email_verified: googleUser.emailVerified,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating user:', createError);
        console.error('❌ Error details:', JSON.stringify(createError, null, 2));
        return res.status(500).json({
          success: false,
          message: `Failed to create user profile: ${createError.message}`,
          error: createError
        });
      }

      user = newUser;
      console.log('✅ New user created:', user.email);
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        provider: 'google'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return user data and token
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          picture: user.picture_url,
          onboardingCompleted: user.onboarding_completed,
          provider: user.provider
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
});

// Google OAuth Code Exchange endpoint
app.post('/api/auth/google-code', async (req, res) => {
  try {
    console.log('📨 Received Google OAuth code exchange request');
    const { code } = req.body;

    if (!code) {
      console.log('❌ No authorization code provided');
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    console.log('🔄 Exchanging code for tokens...');

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'postmessage'
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error('❌ Failed to get access token:', tokens);
      return res.status(400).json({
        success: false,
        message: 'Failed to exchange code for tokens'
      });
    }

    // Get user info from Google
    const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`);
    const googleUser = await userResponse.json();

    console.log('✅ Google user info retrieved:', googleUser.email);

    // Check if user exists in database
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', googleUser.email)
      .single();

    let user;

    if (existingUser) {
      // User already exists, just update their info
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: googleUser.name,
          email_verified: true
        })
        .eq('email', googleUser.email)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update user profile'
        });
      }

      user = updatedUser;
      console.log('✅ User updated:', user.email);
    } else {
      // Create new user
      console.log('📝 Creating new user with data:', {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        id: googleUser.id
      });

      // Create new user (simplified version)
      const { data: newUser, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          email: googleUser.email,
          full_name: googleUser.name,
          email_verified: googleUser.verified_email || true,
          onboarding_completed: false
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating user:', createError);
        console.error('❌ Error details:', JSON.stringify(createError, null, 2));
        return res.status(500).json({
          success: false,
          message: `Failed to create user profile: ${createError.message}`,
          error: createError
        });
      }

      user = newUser;
      console.log('✅ New user created:', user.email);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        provider: 'google'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return user data and token
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          picture: googleUser.picture, // Use Google picture directly
          onboardingCompleted: user.onboarding_completed,
          provider: 'google'
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Google OAuth code exchange error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 ExpenseAI Backend Server Started');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`✅ Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 API Base: http://localhost:${PORT}/api`);
  console.log(`🔐 Google OAuth: Configured`);
});
