import app from '../server.js';

export default function handler(req, res) {
  const rawPath = req.query && req.query.path;
  if (rawPath) {
    const p = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
    const query = req.url && req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = `/api/${p}${query}`;
  } else {
    const forwardedUri = req.headers && (req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.headers['x-matched-path']);
    if (forwardedUri && forwardedUri.startsWith('/api') && !forwardedUri.startsWith('/api/index')) {
      req.url = forwardedUri;
    }
  }
  return app(req, res);
}
