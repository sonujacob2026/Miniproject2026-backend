// Load env from backend/.env regardless of CWD
const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
// Also load default .env (CWD) in case it's there
dotenv.config()
const { createClient } = require('@supabase/supabase-js')

// Optional inline overrides: paste your real values between the quotes
// Example:
// const INLINE_SUPABASE_URL = 'https://your-project.supabase.co'
// const INLINE_SUPABASE_KEY = 'your-service-role-or-anon-key'
const INLINE_SUPABASE_URL = ''
const INLINE_SUPABASE_KEY = ''

// Read from inline first, then Node environment
const SUPABASE_URL = process.env.SUPABASE_URL 
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 

// Validate env
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables:')
  console.error('SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY:', SUPABASE_KEY ? '✅ Set' : '❌ Missing')
  throw new Error('Supabase configuration is incomplete. Paste values into INLINE_* above or set .env')
}

 // Create a single shared client for the backend
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

module.exports = supabase
