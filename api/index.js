import app from '../server.js';

export default function handler(req, res) {
  if (req.headers && req.headers['x-matched-path']) {
    req.url = req.headers['x-matched-path'];
  }
  return app(req, res);
}

