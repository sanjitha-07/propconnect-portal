// test-full-suite.cjs - Complete automated test suite for PropConnect
const http = require('http');

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({ status: res.statusCode, headers: res.headers, data, json });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("==================================================================");
  console.log("🧪 PropConnect Comprehensive Integration & Database Verification");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details}`);
      failed++;
    }
  }

  // 1. Frontend Server
  console.log("\n[1/7] Testing Frontend Dev Server (port 5175)...");
  try {
    const feRes = await request('http://localhost:5175/login');
    assert(feRes.status === 200, "Frontend serves /login with HTTP 200");
    assert(feRes.data.includes('<div id="root">'), "HTML contains Vite root mount container");
    assert(feRes.data.includes('PropConnect'), "HTML title/branding contains PropConnect");
  } catch (err) {
    assert(false, "Frontend server reachable", err.message);
  }

  // 2. Existing Authentication (Legacy seed accounts)
  console.log("\n[2/7] Testing Existing Seed Account Logins (Tenant, Landlord, Admin)...");
  try {
    const tenantLogin = await request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'divya.priya@mail.com', password: 'tenant123' }
    });
    assert(tenantLogin.status === 200, "Existing Tenant Login (divya.priya@mail.com / tenant123)");
    assert(tenantLogin.json && tenantLogin.json.success === true && tenantLogin.json.user.role === 'tenant', "Tenant login returns active user session");

    const landlordLogin = await request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'karthik.raja@mail.com', password: 'land123' }
    });
    assert(landlordLogin.status === 200, "Existing Landlord Login (karthik.raja@mail.com / land123)");
    assert(landlordLogin.json && landlordLogin.json.success === true && landlordLogin.json.user.role === 'landlord', "Landlord login returns active user session");

    const adminLogin = await request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@propconnect.com', password: 'admin123' }
    });
    assert(adminLogin.status === 200, "Existing Admin Login (admin@propconnect.com / admin123)");
    assert(adminLogin.json && adminLogin.json.success === true && adminLogin.json.user.role === 'admin', "Admin login returns active user session");
  } catch (err) {
    assert(false, "Seed logins executed", err.message);
  }

  // 3. New Tenant Registration & Validation
  console.log("\n[3/7] Testing New Tenant Registration with PBKDF2 Password Hashing...");
  const uniqueEmail = `test.tenant.${Date.now()}@chennaihomes.tn`;
  let newTenantUserId = '';

  try {
    // 3a. Invalid email check
    const invalidEmailRes = await request('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: "Test Tenant",
        email: "not-an-email",
        phone: "9840123456",
        password: "ValidPassword1",
        confirmPassword: "ValidPassword1"
      }
    });
    assert(invalidEmailRes.status === 400, "Registration rejects invalid email format (HTTP 400)");

    // 3b. Mismatched passwords check
    const mismatchRes = await request('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: "Test Tenant",
        email: uniqueEmail,
        phone: "9840123456",
        password: "ValidPassword1",
        confirmPassword: "DifferentPassword2"
      }
    });
    assert(mismatchRes.status === 400, "Registration rejects mismatched passwords (HTTP 400)");

    // 3c. Successful registration
    const regRes = await request('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: "Kavitha Sundaram",
        email: uniqueEmail,
        phone: "+91 98401 23456",
        password: "SecureTenant@2026",
        confirmPassword: "SecureTenant@2026",
        preferredCity: "Chennai",
        preferredLocality: "OMR / Perungudi",
        familyMembers: 3
      }
    });
    assert(regRes.status === 201, "New Tenant registration succeeds with HTTP 201 Created");
    assert(regRes.json && regRes.json.user && regRes.json.user.name === "Kavitha Sundaram", "Registration returns created user with name");
    assert(regRes.json && regRes.json.tenant && regRes.json.tenant.id, "Registration creates real tenant record in MongoDB");
    newTenantUserId = regRes.json.user.id || regRes.json.user.entityId;

    // 3d. Duplicate email check
    const dupRes = await request('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: "Duplicate User",
        email: uniqueEmail,
        phone: "9840123456",
        password: "SecureTenant@2026",
        confirmPassword: "SecureTenant@2026"
      }
    });
    assert(dupRes.status === 400 && dupRes.json.message.includes("already exists"), "Registration prevents duplicate email with clean message");

    // 3e. Login with newly created hashed password account
    const newLoginRes = await request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        email: uniqueEmail,
        password: "SecureTenant@2026"
      }
    });
    assert(newLoginRes.status === 200, "New tenant can authenticate using hashed PBKDF2 credentials");
    assert(newLoginRes.json && newLoginRes.json.user && newLoginRes.json.user.email === uniqueEmail, "Logged in user email matches registered email");

  } catch (err) {
    assert(false, "Registration flow executed", err.message);
  }

  // 4. Property Photos & Gallery Data
  console.log("\n[4/7] Testing Property Photo Gallery & Specific Media API...");
  try {
    const imagesRes = await request('http://localhost:5000/api/properties/TN101/images');
    assert(imagesRes.status === 200, "GET /api/properties/TN101/images returns HTTP 200");
    assert(imagesRes.json && Array.isArray(imagesRes.json.images), "Images endpoint returns an array of photo objects");
    const photos = imagesRes.json.images || [];
    assert(photos.length >= 8, `TN101 has rich multi-photo gallery (${photos.length} photos)`);

    const categories = new Set(photos.map(img => img.category));
    assert(categories.has('Exterior'), "Gallery contains 'Exterior' photos");
    assert(categories.has('Living Room'), "Gallery contains 'Living Room' photos");
    assert(categories.has('Kitchen'), "Gallery contains 'Kitchen' photos");
    assert([...categories].some(c => c.includes('Bedroom')), "Gallery contains Bedroom photos (Master Bedroom / Bedroom 2)");
    assert(categories.has('Bathroom'), "Gallery contains 'Bathroom' photos");
    assert(categories.has('Balcony'), "Gallery contains 'Balcony' photos");
    assert(categories.has('Parking'), "Gallery contains 'Parking' photos");
    assert([...categories].some(c => c.includes('Common') || c.includes('Amenities') || c.includes('Dining')), "Gallery contains Common/Dining/Amenities photos");

    // Check second property (TN102) to verify properties have DISTINCT galleries
    const imagesRes2 = await request('http://localhost:5000/api/properties/TN102/images');
    assert(imagesRes2.status === 200, "GET /api/properties/TN102/images returns HTTP 200");
    const tn101Main = photos[0].url;
    const tn102Main = imagesRes2.json.images[0].url;
    assert(tn101Main !== tn102Main, "Different properties have distinct, property-specific photo URLs");
  } catch (err) {
    assert(false, "Photo gallery data tested", err.message);
  }

  // 5. Database Favorites Persistence
  console.log("\n[5/7] Testing Database-backed Property Favorites...");
  try {
    // 5a. Save TN101 as favorite
    const favPost = await request('http://localhost:5000/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { propertyId: 'TN101', userId: newTenantUserId }
    });
    assert(favPost.status === 200, "POST /api/favorites successfully saves property to MongoDB");
    assert(favPost.json && favPost.json.isFavorite === true, "Response confirms property is now favorited");
    assert(favPost.json && favPost.json.propertyIds.includes('TN101'), "TN101 is present in returned propertyIds");

    // 5b. Fetch favorites list
    const favList = await request(`http://localhost:5000/api/favorites?userId=${newTenantUserId}`);
    assert(favList.status === 200, "GET /api/favorites returns HTTP 200");
    assert(favList.json && favList.json.propertyIds.includes('TN101'), "Favorited property TN101 persists in database list across queries");
    assert(favList.json.properties && favList.json.properties.length > 0, "Favorites endpoint populates full property details");

    // 5c. Toggle favorite off
    const favToggleOff = await request('http://localhost:5000/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { propertyId: 'TN101', userId: newTenantUserId }
    });
    assert(favToggleOff.json && favToggleOff.json.isFavorite === false, "Toggling favorite again removes it from database");

    // 5d. Confirm removed
    const favListAfter = await request(`http://localhost:5000/api/favorites?userId=${newTenantUserId}`);
    assert(!favListAfter.json.propertyIds.includes('TN101'), "Property TN101 is no longer in favorites list");
  } catch (err) {
    assert(false, "Favorites persistence tested", err.message);
  }

  // 6. Property Chatbot (English & Tamil Specific Inquiries)
  console.log("\n[6/7] Testing Property Chatbot (English & Tamil)...");
  try {
    const chatEnRes = await request('http://localhost:5000/api/property-chat/TN101/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        message: 'Is parking available?',
        language: 'en',
        userId: newTenantUserId
      }
    });
    assert(chatEnRes.status === 200, "Property chat responds to English parking question (HTTP 200)");
    assert(chatEnRes.json && chatEnRes.json.answer && chatEnRes.json.answer.toLowerCase().includes('parking'), "Response contains property-specific parking information");

    const chatTaRes = await request('http://localhost:5000/api/property-chat/TN101/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        message: 'வாடகை எவ்வளவு?',
        language: 'ta',
        userId: newTenantUserId
      }
    });
    assert(chatTaRes.status === 200, "Property chat responds to Tamil query (HTTP 200)");
    assert(chatTaRes.json && chatTaRes.json.answer && chatTaRes.json.answer.includes('மாத வாடகை'), "Response returned in Tamil with property rent info");
  } catch (err) {
    assert(false, "Property chatbot tested", err.message);
  }

  // 7. General System Health & Core Collections
  console.log("\n[7/7] Testing Core Properties, Leases, and Tenants Collections...");
  try {
    const propsRes = await request('http://localhost:5000/api/properties');
    assert(propsRes.status === 200, "GET /api/properties returns HTTP 200");
    assert(Array.isArray(propsRes.json) && propsRes.json.length > 0, `Properties loaded from MongoDB (${propsRes.json.length} properties)`);

    const tenantsRes = await request('http://localhost:5000/api/tenants');
    assert(tenantsRes.status === 200, "GET /api/tenants returns HTTP 200");
    assert(Array.isArray(tenantsRes.json) && tenantsRes.json.length > 0, `Tenants loaded from MongoDB (${tenantsRes.json.length} tenants)`);

    const landlordsRes = await request('http://localhost:5000/api/landlords');
    assert(landlordsRes.status === 200, "GET /api/landlords returns HTTP 200");
    assert(Array.isArray(landlordsRes.json) && landlordsRes.json.length > 0, `Landlords loaded from MongoDB (${landlordsRes.json.length} landlords)`);

    const leasesRes = await request('http://localhost:5000/api/leases');
    assert(leasesRes.status === 200, "GET /api/leases returns HTTP 200");
    assert(Array.isArray(leasesRes.json) && leasesRes.json.length > 0, `Leases loaded from MongoDB (${leasesRes.json.length} leases)`);
  } catch (err) {
    assert(false, "Core collections health tested", err.message);
  }

  // 8. Dynamic Theme & Typography Customization (MongoDB Persistence)
  console.log("\n[8/8] Testing Dynamic Theme & Typography Settings Persistence...");
  try {
    // 8a. GET Theme settings
    const themeGet = await request('http://localhost:5000/api/settings/theme');
    assert(themeGet.status === 200, "GET /api/settings/theme returns HTTP 200");
    assert(themeGet.json && themeGet.json.settings, "Theme settings document returned from MongoDB Compass");

    // 8b. PUT Update Global Theme Settings (Teal preset + Poppins font)
    const themePut = await request('http://localhost:5000/api/settings/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: {
        primaryColor: '#1D95AD',
        fontFamily: 'Poppins',
        language: 'en',
        fontSize: 'medium',
        themeMode: 'light',
        appName: 'PropConnect Management System'
      }
    });
    assert(themePut.status === 200, "PUT /api/settings/theme persists updated theme to MongoDB (HTTP 200)");
    assert(themePut.json && themePut.json.settings && themePut.json.settings.primaryColor === '#1D95AD', "Primary color persisted as #1D95AD (Teal)");
    assert(themePut.json.settings.fontFamily === 'Poppins', "Font family persisted as Poppins");

    // 8c. Verify persistence across fresh GET
    const themeVerify = await request('http://localhost:5000/api/settings/theme');
    assert(themeVerify.json.settings.primaryColor === '#1D95AD', "Theme persistence verified via fresh GET /api/settings/theme");
    assert(themeVerify.json.settings.fontFamily === 'Poppins', "Typography persistence verified via fresh GET /api/settings/theme");

    // 8d. Test User-specific personal settings
    const userSettingsPut = await request('http://localhost:5000/api/settings/user/TEN001', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: {
        primaryColor: '#7B1FA2',
        fontFamily: 'Roboto',
        language: 'ta',
        themeMode: 'dark'
      }
    });
    assert(userSettingsPut.status === 200, "PUT /api/settings/user/TEN001 stores tenant custom theme (HTTP 200)");
    const userSettingsGet = await request('http://localhost:5000/api/settings/user/TEN001');
    assert(userSettingsGet.status === 200 && userSettingsGet.json.settings.primaryColor === '#7B1FA2', "Tenant personal theme retrieved from MongoDB");
  } catch (err) {
    assert(false, "Theme & Typography settings persistence tested", err.message);
  }

  console.log("\n==================================================================");
  console.log(`📊 Test Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed === 0) {
    console.log("🎉 ALL TESTS PASSED! Backend & Frontend are fully functional.");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("FATAL TEST ERROR:", err);
  process.exit(1);
});
