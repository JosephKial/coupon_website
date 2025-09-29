const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

const testCoupon = {
  code: 'TEST50',
  description: 'Test coupon for 50% off',
  discountType: 'PERCENTAGE',
  faceValue: 50,
  expirationDate: '2024-12-31T23:59:59.000Z',
  usageLimit: 10,
  tags: ['test', 'discount']
};

let authToken = '';
let couponId = '';

async function testCouponEndpoints() {
  try {
    console.log('🧪 Testing Coupon CRUD Endpoints...\n');

    // 1. Register a test user
    console.log('1. Registering test user...');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, testUser);
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists, continuing...');
      } else {
        throw error;
      }
    }

    // 2. Login to get auth token
    console.log('\n2. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 3. Create a coupon
    console.log('\n3. Creating a coupon...');
    const createResponse = await axios.post(`${BASE_URL}/api/coupons`, testCoupon, { headers });
    couponId = createResponse.data.data.id;
    console.log('✅ Coupon created successfully');
    console.log(`   Coupon ID: ${couponId}`);
    console.log(`   Code: ${createResponse.data.data.code}`);

    // 4. Get all coupons
    console.log('\n4. Retrieving all coupons...');
    const getAllResponse = await axios.get(`${BASE_URL}/api/coupons`, { headers });
    console.log('✅ Coupons retrieved successfully');
    console.log(`   Total coupons: ${getAllResponse.data.data.total}`);

    // 5. Get specific coupon by ID
    console.log('\n5. Retrieving coupon by ID...');
    const getByIdResponse = await axios.get(`${BASE_URL}/api/coupons/${couponId}`, { headers });
    console.log('✅ Coupon retrieved by ID successfully');
    console.log(`   Code: ${getByIdResponse.data.data.code}`);

    // 6. Update the coupon
    console.log('\n6. Updating coupon...');
    const updateData = {
      description: 'Updated test coupon for 25% off',
      faceValue: 25
    };
    const updateResponse = await axios.put(`${BASE_URL}/api/coupons/${couponId}`, updateData, { headers });
    console.log('✅ Coupon updated successfully');
    console.log(`   New face value: ${updateResponse.data.data.faceValue}`);

    // 7. Get coupon statistics
    console.log('\n7. Getting coupon statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/api/coupons/stats`, { headers });
    console.log('✅ Statistics retrieved successfully');
    console.log(`   Total coupons: ${statsResponse.data.data.totalCoupons}`);
    console.log(`   Active coupons: ${statsResponse.data.data.activeCoupons}`);

    // 8. Search/filter coupons
    console.log('\n8. Testing coupon search and filtering...');
    const searchResponse = await axios.get(`${BASE_URL}/api/coupons?search=test&status=ACTIVE&limit=5`, { headers });
    console.log('✅ Search/filter successful');
    console.log(`   Found ${searchResponse.data.data.coupons.length} coupons`);

    // 9. Delete the coupon
    console.log('\n9. Deleting coupon...');
    await axios.delete(`${BASE_URL}/api/coupons/${couponId}`, { headers });
    console.log('✅ Coupon deleted successfully');

    // 10. Verify deletion
    console.log('\n10. Verifying coupon deletion...');
    try {
      await axios.get(`${BASE_URL}/api/coupons/${couponId}`, { headers });
      console.log('❌ Coupon should have been deleted');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Coupon deletion verified');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All coupon endpoint tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Test error cases
async function testErrorCases() {
  try {
    console.log('\n🧪 Testing Error Cases...\n');

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Test invalid coupon data
    console.log('1. Testing invalid coupon data...');
    try {
      await axios.post(`${BASE_URL}/api/coupons`, {
        code: '', // Empty code
        discountType: 'INVALID',
        faceValue: -10
      }, { headers });
      console.log('❌ Should have failed validation');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Validation error handled correctly');
      } else {
        throw error;
      }
    }

    // Test unauthorized access
    console.log('\n2. Testing unauthorized access...');
    try {
      await axios.get(`${BASE_URL}/api/coupons`);
      console.log('❌ Should have required authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Authentication required correctly');
      } else {
        throw error;
      }
    }

    // Test invalid coupon ID
    console.log('\n3. Testing invalid coupon ID...');
    try {
      await axios.get(`${BASE_URL}/api/coupons/invalid-id`, { headers });
      console.log('❌ Should have failed with invalid ID');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid ID error handled correctly');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All error case tests passed!');

  } catch (error) {
    console.error('\n❌ Error case test failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testCouponEndpoints();
  await testErrorCases();
}

if (require.main === module) {
  runTests();
}

module.exports = { testCouponEndpoints, testErrorCases };