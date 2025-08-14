#!/usr/bin/env node

// This script starts the development server with proper host configuration
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.VITE_ALLOWED_HOSTS = 'all';

// Start the server
const server = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    VITE_ALLOWED_HOSTS: 'all'
  }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  process.exit(code || 0);
});