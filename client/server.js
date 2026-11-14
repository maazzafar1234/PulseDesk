/**
 * Production server for PulseDesk frontend
 * Serves static files and proxies /api/config to the backend
 */

const express = require('express');
const httpProxy = require('http-proxy');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Backend URL - in K8s it's pulsedesk-backend:5000, in dev it's localhost:5000
const BACKEND_URL = process.env.BACKEND_URL || 'http://pulsedesk-backend:5000';

console.log(`🚀 Frontend server starting on port ${PORT}`);
console.log(`📡 Backend URL: ${BACKEND_URL}`);

// Create a proxy for API requests
const apiProxy = httpProxy.createProxyServer({
  target: BACKEND_URL,
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
});

// Handle proxy errors
apiProxy.on('error', (err, req, res) => {
  console.error('❌ Proxy error:', err.message);
  res.status(502).json({
    error: 'Backend service unavailable',
    message: err.message,
  });
});

// Proxy /api requests to backend (including /api/config)
app.use('/api', (req, res) => {
  console.log(`📤 Proxying ${req.method} ${req.url} to ${BACKEND_URL}${req.url}`);
  apiProxy.web(req, res);
});

// Serve static files from dist folder
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for client-side routing
// This catches all requests not matched by static files or /api
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Frontend server running on http://localhost:${PORT}`);
  console.log(`✓ Static files served from ${distPath}`);
  console.log(`✓ API requests proxied to ${BACKEND_URL}`);
});
