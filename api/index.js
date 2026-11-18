import app from '../server.js';

export default function handler(req, res) {
  const queryIndex = req.url ? req.url.indexOf('?') : -1;
  const rawQuery = queryIndex !== -1 ? req.url.substring(queryIndex + 1) : '';
  const searchParams = new URLSearchParams(rawQuery);
  const fullPath = (req.query && req.query.__fullpath) || searchParams.get('__fullpath');
  const subPath = (req.query && (req.query.__path || req.query.path)) || searchParams.get('__path');

  searchParams.delete('__path');
  searchParams.delete('__fullpath');
  const cleanQuery = searchParams.toString() ? `?${searchParams.toString()}` : '';

  if (fullPath) {
    const fp = Array.isArray(fullPath) ? fullPath.join('/') : String(fullPath);
    req.url = `${fp.startsWith('/') ? fp : '/' + fp}${cleanQuery}`;
  } else if (subPath) {
    const sp = Array.isArray(subPath) ? subPath.join('/') : String(subPath);
    req.url = `/api/${sp.replace(/^\/+/, '')}${cleanQuery}`;
  } else {
    const forwardedUri = req.headers && (req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.headers['x-matched-path']);
    if (forwardedUri && !forwardedUri.startsWith('/api/index')) {
      req.url = forwardedUri;
    }
  }
  return app(req, res);
}

