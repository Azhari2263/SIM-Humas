import app from '../server.js';

export default function handler(req, res) {
  const possibleUrls = [
    req.headers && req.headers['x-forwarded-uri'],
    req.headers && req.headers['x-matched-path'],
    req.headers && req.headers['x-invoke-path'],
    req.originalUrl
  ];
  for (const candidate of possibleUrls) {
    if (candidate && candidate.startsWith('/api') && candidate !== '/api') {
      req.url = candidate;
      break;
    }
  }
  return app(req, res);
}

