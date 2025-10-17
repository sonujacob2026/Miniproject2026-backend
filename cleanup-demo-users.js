const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupDemoUsers() {
  console.log('🧹 Cleaning up demo Google users...');
  
  try {
    // Remove demo users with demo emails
    const demoEmails = [
      'demo@gmail.com',
      'demo@example.com',
      'test@gmail.com',
      'google_demo@gmail.com'
    ];

    for (const email of demoEmails) {
      const { data, error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('email', email);
      
      if (error) {
        console.error(`❌ Error removing ${email}:`, error.message);
      } else {
        console.log(`✅ Removed demo user: ${email}`);
      }
    }

    // Remove users with demo Google IDs
    const { data: demoGoogleUsers, error: googleError } = await supabase
      .from('user_profiles')
      .delete()
      .like('google_id', 'google_demo_%');

    if (googleError) {
      console.error('❌ Error removing demo Google users:', googleError.message);
    } else {
      console.log('✅ Removed users with demo Google IDs');
    }

    // Check remaining users
    const { data: remainingUsers, error: fetchError } = await supabase
      .from('user_profiles')
      .select('email, full_name, provider, google_id');
    
    if (fetchError) {
      console.error('❌ Error fetching remaining users:', fetchError);
      return;
    }
    
    console.log('\n📋 Remaining users in database:');
    if (remainingUsers.length === 0) {
      console.log('   No users found - database is clean');
    } else {
      remainingUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.full_name} (${user.email}) - Provider: ${user.provider}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupDemoUsers();
