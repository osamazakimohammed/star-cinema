const express = require('express');
const { pool } = require('../db');
const router = express.Router();

async function getMoviesBySource(source, search) {
  const values = [source];
  let filter = '';
  if (search) {
    filter = ' AND (title LIKE ? OR genre LIKE ?)';
    values.push(`%${search}%`, `%${search}%`);
  }
  const [movies] = await pool.execute(
    `SELECT id,title,description,genre,duration_minutes,rating,poster_url,release_year
     FROM movies WHERE catalog_source=?${filter} ORDER BY title`,
    values
  );
  return movies;
}

router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const [custom] = await pool.query("SELECT id FROM movies WHERE catalog_source='custom' LIMIT 1");
    const source = custom.length ? 'custom' : 'sample';
    const movies = await getMoviesBySource(source, search);
    res.json({ movies, source });
  } catch (error) {
    res.status(500).json({ error: 'Could not load movies.' });
  }
});

router.get('/:movieId/showtimes', async (req, res, next) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!Number.isSafeInteger(movieId) || movieId < 1) return res.status(400).json({ error: 'Invalid movie id.' });
    const [showtimes] = await pool.execute(
      `SELECT s.id,s.movie_id,s.starts_at,s.screen_name,s.ticket_price,
        (SELECT COUNT(*) FROM bookings b WHERE b.showtime_id=s.id AND b.status='confirmed') AS booked_seats
       FROM showtimes s WHERE s.movie_id=? AND s.starts_at > NOW() ORDER BY s.starts_at`, [movieId]);
    res.json({ showtimes });
  } catch (error) { next(error); }
});

module.exports = router;
