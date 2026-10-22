const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = String(req.headers.cookie || '')
    .split(';')
    .map(value => value.trim())
    .find(value => value.startsWith('starCinemaSession='))
    ?.slice('starCinemaSession='.length);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: Number(payload.sub), email: payload.email, name: payload.name };
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session is invalid or expired. Please log in again.' });
  }
}

module.exports = { requireAuth };
