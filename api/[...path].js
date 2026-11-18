import app from '../server.js';

export default function handler(req, res) {
  const queryIndex = req.url ? req.url.indexOf('?') : -1;
  const rawQuery = queryIndex !== -1 ? req.url.substring(queryIndex + 1) : '';
  const searchParams = new URLSearchParams(rawQuery);
  const rawPath = (req.query && (req.query.path || req.query.__path)) || searchParams.get('__path') || searchParams.get('path');

  searchParams.delete('path');
  searchParams.delete('__path');
  const cleanQuery = searchParams.toString() ? `?${searchParams.toString()}` : '';

  if (rawPath) {
    const p = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath);
    req.url = `/api/${p.replace(/^\/+/, '')}${cleanQuery}`;
  } else {
    const forwardedUri = req.headers && (req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.headers['x-matched-path']);
    if (forwardedUri && forwardedUri.startsWith('/api') && !forwardedUri.startsWith('/api/index')) {
      req.url = forwardedUri;
    }
  }
  return app(req, res);
}

