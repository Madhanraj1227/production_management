#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimized build process...');

// Set memory and build optimizations
process.env.NODE_OPTIONS = '--max-old-space-size=2048';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';
process.env.CI = 'false';
process.env.SKIP_PREFLIGHT_CHECK = 'true';

try {
  // Check if client directory exists
  const clientDir = path.join(__dirname, 'client');
  if (!fs.existsSync(clientDir)) {
    throw new Error('Client directory not found');
  }

  console.log('📦 Installing client dependencies...');
  execSync('npm install --no-audit --no-fund', { 
    cwd: clientDir, 
    stdio: 'inherit',
    timeout: 180000 // 3 minutes timeout
  });

  console.log('🔨 Building React application with react-scripts...');
  // Call react-scripts directly to avoid infinite loop
  execSync('npx react-scripts build', { 
    cwd: clientDir, 
    stdio: 'inherit',
    timeout: 300000, // 5 minutes timeout
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=2048',
      GENERATE_SOURCEMAP: 'false',
      DISABLE_ESLINT_PLUGIN: 'true',
      CI: 'false',
      SKIP_PREFLIGHT_CHECK: 'true'
    }
  });

  // Verify build
  const buildDir = path.join(clientDir, 'build');
  if (!fs.existsSync(buildDir)) {
    throw new Error('Build directory not created');
  }

  const indexHtml = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    throw new Error('Build failed - index.html not found');
  }

  console.log('✅ Build completed successfully!');
  console.log('📁 Build files created in:', buildDir);
  
  // List build contents for verification
  const buildFiles = fs.readdirSync(buildDir);
  console.log('🗃️  Build contents:', buildFiles.slice(0, 10).join(', '));

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 