#!/usr/bin/env node

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Real awesome-video API data
let awesomeVideoData = [];

// Fetch the real awesome-video data on startup
async function loadAwesomeVideoData() {
  try {
    console.log('📥 Fetching awesome-video data...');
    const response = await fetch('https://raw.githubusercontent.com/krzemienski/awesome-video/master/contents.json');
    const data = await response.json();
    
    // Handle both array and object responses
    const items = Array.isArray(data) ? data : data.resources || [];
    awesomeVideoData = items.map(item => ({
      title: item.title || 'Untitled',
      url: item.url || '',
      description: item.description || '',
      category: item.category || 'Uncategorized',
      subcategory: item.subcategory || null
    }));
    
    console.log(`✅ Loaded ${awesomeVideoData.length} awesome-video resources`);
  } catch (error) {
    console.error('❌ Failed to load awesome-video data:', error);
    // Fallback to sample data if fetch fails
    awesomeVideoData = [
      {
        title: "FFmpeg",
        url: "https://ffmpeg.org/",
        description: "A complete, cross-platform solution to record, convert and stream audio and video.",
        category: "Encoding",
        subcategory: "Tools"
      }
    ];
  }
}

app.get('/api/awesome-video/resources', (req, res) => {
  res.json(awesomeVideoData);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    host: req.get('host'),
    port: PORT 
  });
});

// Serve static files from dist/public
const distPath = path.join(__dirname, 'dist', 'public');
app.use(express.static(distPath));

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(distPath, 'index.html'));
});

// Load awesome-video data then start server
loadAwesomeVideoData().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Static server running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Serving from: ${distPath}`);
    console.log(`🌐 Should work with any Replit host`);
    console.log(`📊 API serving ${awesomeVideoData.length} resources`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});