// Simple manual test script to verify auth endpoints
// Run with: node test-auth-endpoints.js

const baseUrl = 'http://localhost:3001';

async function testRegistration() {
  console.log('Testing user registration...');
  
  const userData = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe',
  };

  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();
    console.log('Registration response:', result);
    
    if (response.ok) {
      console.log('✅ Registration successful');
      return true;
    } else {
      console.log('❌ Registration failed:', result.error?.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\nTesting user login...');
  
  const loginData = {
    email: 'test@example.com',
    password: 'TestPassword123!',
  };

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    const result = await response.json();
    console.log('Login response:', result);
    
    if (response.ok) {
      console.log('✅ Login successful');
      return result.data.accessToken;
    } else {
      console.log('❌ Login failed:', result.error?.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return null;
  }
}

async function testProfile(accessToken) {
  console.log('\nTesting get profile...');
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const result = await response.json();
    console.log('Profile response:', result);
    
    if (response.ok) {
      console.log('✅ Profile retrieval successful');
      return true;
    } else {
      console.log('❌ Profile retrieval failed:', result.error?.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Profile error:', error.message);
    return false;
  }
}

async function testHealthCheck() {
  console.log('Testing health check...');
  
  try {
    const response = await fetch(`${baseUrl}/health`);
    const result = await response.json();
    console.log('Health check response:', result);
    
    if (response.ok) {
      console.log('✅ Health check successful');
      return true;
    } else {
      console.log('❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting authentication endpoint tests...\n');
  
  // Test health check first
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Server is not running. Please start the server first.');
    return;
  }
  
  // Test registration
  const registrationOk = await testRegistration();
  
  // Test login
  const accessToken = await testLogin();
  
  // Test profile if login was successful
  if (accessToken) {
    await testProfile(accessToken);
  }
  
  console.log('\n🏁 Tests completed!');
}

runTests().catch(console.error);