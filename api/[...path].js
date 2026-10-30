import app from '../server.js';

export default function handler(req, res) {
  const forwardedUri = req.headers && req.headers['x-forwarded-uri'];
  if (forwardedUri && forwardedUri.startsWith('/api') && !forwardedUri.startsWith('/api/index')) {
    req.url = forwardedUri;
  }
  return app(req, res);
}
