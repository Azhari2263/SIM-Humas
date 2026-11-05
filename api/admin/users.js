import app from '../../server.js';

export default function handler(req, res) {
  const forwardedUri = req.headers && (req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.headers['x-matched-path']);
  if (forwardedUri && forwardedUri.startsWith('/api') && !forwardedUri.startsWith('/api/index')) {
    req.url = forwardedUri;
  } else if (!req.url || !req.url.startsWith('/api')) {
    const query = req.url && req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = '/api/admin/users' + query;
  }
  return app(req, res);
}
