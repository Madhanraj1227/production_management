#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Render-optimized build process...');

// Set memory limits
process.env.NODE_OPTIONS = '--max-old-space-size=3072';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';

try {
  // Check if client directory exists
  const clientDir = path.join(__dirname, 'client');
  if (!fs.existsSync(clientDir)) {
    throw new Error('Client directory not found');
  }

  console.log('📦 Installing client dependencies...');
  execSync('npm install --production=false', { 
    cwd: clientDir, 
    stdio: 'inherit',
    timeout: 300000 // 5 minutes timeout
  });

  console.log('🔨 Building React application...');
  execSync('npm run build', { 
    cwd: clientDir, 
    stdio: 'inherit',
    timeout: 600000 // 10 minutes timeout
  });

  // Verify build output
  const buildDir = path.join(clientDir, 'build');
  if (!fs.existsSync(buildDir)) {
    throw new Error('Build directory was not created');
  }

  const indexHtml = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    throw new Error('index.html was not generated');
  }

  console.log('✅ Build completed successfully!');
  console.log('📁 Build artifacts:');
  const files = fs.readdirSync(buildDir);
  files.forEach(file => console.log(`   - ${file}`));

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 