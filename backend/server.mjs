/**
 * CampusFind Standalone Backend API Server
 * Serves all /api/* endpoints backed by backend/campusfind.db (node:sqlite).
 * Usage: node backend/server.mjs
 */

import http from 'node:http';
import { handleApiRequest } from './apiRouter.js';

const PORT = Number(process.env.PORT || 8000);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.url && req.url.startsWith('/api/')) {
    handleApiRequest(req, res);
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ service: 'CampusFind API Server', status: 'running' }));
});

server.listen(PORT, () => {
  console.log(`CampusFind Backend API Server running at http://localhost:${PORT}/api`);
});
