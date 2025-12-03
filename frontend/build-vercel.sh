#!/bin/bash
set -e
echo "Starting custom build..."
npm install --legacy-peer-deps
npm install vite@latest --save-dev --legacy-peer-deps
npx --yes vite@latest build
echo "Build completed!"
