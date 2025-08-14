#!/usr/bin/env node

// Set environment variables to disable Vite host checking
process.env.DANGEROUSLY_DISABLE_HOST_CHECK = 'true';
process.env.HOST = '0.0.0.0';
process.env.DISABLE_HOST_CHECK = 'true';
process.env.WDS_SOCKET_HOST = '0.0.0.0';

// Import and run the main server
import('./server/index.ts');