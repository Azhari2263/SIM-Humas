import app from '../server.js';

export default function handler(req, res) {
  const forwardedUri = req.headers && (req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.headers['x-matched-path']);
  if (forwardedUri && forwardedUri.startsWith('/api') && !forwardedUri.startsWith('/api/index')) {
    req.url = forwardedUri;
  }
  return app(req, res);
}
