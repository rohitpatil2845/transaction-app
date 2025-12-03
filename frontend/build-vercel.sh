#!/bin/bash
set -e
echo "Starting custom build..."
cd /vercel/path0/frontend || cd frontend || exit 1
echo "Installing dependencies..."
npm install --legacy-peer-deps
echo "Building with node..."
node ./node_modules/vite/bin/vite.js build
echo "Build completed!"
