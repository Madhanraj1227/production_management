#!/bin/bash

# Render build script with memory optimization
echo "Starting Render build process..."

# Set higher memory limits for Node.js
export NODE_OPTIONS="--max-old-space-size=1024"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Build client with memory optimization
echo "Building client application..."
cd client

# Install client dependencies
echo "Installing client dependencies..."
npm install

# Build with increased memory
echo "Running React build with memory optimization..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build

cd ..

echo "Build completed successfully!" 