// Environment Variable Debug Script
// Run this to verify your environment variables are set correctly

require('dotenv').config();

console.log('🔍 Environment Variables Debug Report');
console.log('=====================================');

const requiredVars = [
  'NODE_ENV',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID', 
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_CLIENT_CERT_URL'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName === 'FIREBASE_PRIVATE_KEY') {
      console.log(`✅ ${varName}: Present (${value.length} characters)`);
      console.log(`   - Starts with: ${value.substring(0, 25)}...`);
      console.log(`   - Contains \\n: ${value.includes('\\n') ? 'Yes' : 'No'}`);
      console.log(`   - Actual newlines: ${value.includes('\n') ? 'Yes' : 'No'}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: MISSING`);
  }
});

console.log('\n🔥 Firebase Configuration Test');
console.log('==============================');

// Test Firebase configuration
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

console.log('Service Account Keys:');
Object.keys(serviceAccount).forEach(key => {
  if (key === 'private_key') {
    console.log(`  ${key}: ${serviceAccount[key] ? 'Present' : 'Missing'}`);
  } else {
    console.log(`  ${key}: ${serviceAccount[key] || 'Missing'}`);
  }
}); 