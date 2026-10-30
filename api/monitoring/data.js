import app from '../../server.js';

export default function handler(req, res) {
  const query = req.url && req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  req.url = '/api/monitoring/data' + query;
  return app(req, res);
}
