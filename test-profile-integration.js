// Test script to verify profile integration
// Run this in the browser console after setting up the database

console.log('🧪 Testing Profile Integration...');

// Test 1: Check if ProfileService is available
if (typeof ProfileService !== 'undefined') {
  console.log('✅ ProfileService is available');
} else {
  console.log('❌ ProfileService is not available');
}

// Test 2: Check if user is authenticated
const checkUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('✅ User is authenticated:', user.id);
      return user;
    } else {
      console.log('❌ No authenticated user');
      return null;
    }
  } catch (error) {
    console.log('❌ Error checking user:', error);
    return null;
  }
};

// Test 3: Test profile operations
const testProfileOperations = async () => {
  const user = await checkUser();
  if (!user) return;

  try {
    // Test saving a profile
    const testProfileData = {
      householdMembers: '2',
      monthlyIncome: '50000',
      hasDebt: 'yes',
      debtAmount: '10000',
      primaryExpenses: ['Groceries', 'Rent/Mortgage', 'Transportation'],
      budgetingExperience: 'intermediate',
      financialGoals: ['Build Emergency Fund', 'Pay Off Debt']
    };

    console.log('🔄 Testing profile save...');
    const saveResult = await ProfileService.saveProfile(testProfileData, user.id);
    
    if (saveResult.success) {
      console.log('✅ Profile saved successfully:', saveResult.data);
    } else {
      console.log('❌ Profile save failed:', saveResult.error);
    }

    // Test retrieving the profile
    console.log('🔄 Testing profile retrieval...');
    const getResult = await ProfileService.getProfile(user.id);
    
    if (getResult.success) {
      console.log('✅ Profile retrieved successfully:', getResult.data);
    } else {
      console.log('❌ Profile retrieval failed:', getResult.error);
    }

    // Test formatted profile
    console.log('🔄 Testing formatted profile...');
    const formattedResult = await ProfileService.getFormattedProfile(user.id);
    
    if (formattedResult.success) {
      console.log('✅ Formatted profile retrieved successfully:', formattedResult.data);
    } else {
      console.log('❌ Formatted profile retrieval failed:', formattedResult.error);
    }

  } catch (error) {
    console.log('❌ Error in profile operations:', error);
  }
};

// Run the tests
testProfileOperations();

console.log('🧪 Profile integration test completed. Check the results above.');