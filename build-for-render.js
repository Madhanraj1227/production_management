#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimized build process...');
console.log('📍 Current working directory:', process.cwd());
console.log('📍 Script directory:', __dirname);

// Set memory and build optimizations
process.env.NODE_OPTIONS = '--max-old-space-size=2048';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';
process.env.CI = 'false';
process.env.SKIP_PREFLIGHT_CHECK = 'true';

try {
  // Check multiple possible client directory locations
  let clientDir;
  const possiblePaths = [
    path.join(__dirname, 'client'),
    path.join(process.cwd(), 'client'),
    path.join(__dirname, '..', 'client'),
    './client'
  ];

  console.log('🔍 Searching for client directory in possible locations:');
  for (const testPath of possiblePaths) {
    const resolvedPath = path.resolve(testPath);
    console.log(`  - Testing: ${testPath} -> ${resolvedPath}`);
    
    if (fs.existsSync(resolvedPath)) {
      console.log(`    ✅ Directory exists`);
      
      // Show contents of the client directory
      try {
        const clientContents = fs.readdirSync(resolvedPath);
        console.log(`    📁 Contents: ${clientContents.join(', ')}`);
        
        const packageJsonPath = path.join(resolvedPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          console.log(`    ✅ package.json found`);
          clientDir = resolvedPath;
          console.log(`  🎯 Selected client directory: ${clientDir}`);
          break;
        } else {
          console.log(`    ❌ package.json NOT found at: ${packageJsonPath}`);
        }
      } catch (err) {
        console.log(`    ❌ Error reading directory: ${err.message}`);
      }
    } else {
      console.log(`    ❌ Directory does not exist`);
    }
  }

  if (!clientDir) {
    console.log('📁 Available directories in current location:');
    const currentDirContents = fs.readdirSync(process.cwd());
    currentDirContents.forEach(item => {
      const itemPath = path.join(process.cwd(), item);
      const isDir = fs.statSync(itemPath).isDirectory();
      console.log(`  ${isDir ? '[DIR]' : '[FILE]'} ${item}`);
    });
    throw new Error('Client directory with package.json not found in any expected location');
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
  console.error('🔍 Error details:', error);
  process.exit(1);
} 