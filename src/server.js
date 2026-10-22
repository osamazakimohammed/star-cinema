const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { checkDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const showtimeRoutes = require('./routes/showtimes');
const bookingRoutes = require('./routes/bookings');

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET must be configured.');
if (jwtSecret.startsWith('replace_') || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be a private random value of at least 32 characters.');
}

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'https://image.tmdb.org', 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"], formAction: ["'self'"] } } }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.get('/api/health', async (req, res) => {
  try {
    await checkDatabase();
    res.json({ status: 'ok', application: 'star-cinema', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[health] Database check failed:', error.code || error.name, error.message);
    res.status(503).json({ status: 'degraded', application: 'star-cinema', database: 'disconnected', error: 'Database connection failed.' });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Unexpected server error.' });
});

if (require.main === module) {
  const port = Number(process.env.PORT);
  app.listen(port, () => console.log(`STAR Cinema listening on port ${port}`));
}
module.exports = app;
