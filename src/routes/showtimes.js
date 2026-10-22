const express = require('express');
const { pool } = require('../db');
const router = express.Router();
const SEATS = Array.from({ length: 8 }, (_, row) => 'ABCDEFGH'[row]).flatMap(letter => Array.from({ length: 10 }, (_, i) => `${letter}${i + 1}`));

router.get('/:showtimeId/seats', async (req, res, next) => {
  try {
    const showtimeId = Number(req.params.showtimeId);
    if (!Number.isSafeInteger(showtimeId) || showtimeId < 1) return res.status(400).json({ error: 'Invalid showtime id.' });
    const [times] = await pool.execute('SELECT id,starts_at FROM showtimes WHERE id=? AND starts_at > NOW()', [showtimeId]);
    if (!times.length) return res.status(404).json({ error: 'Showtime not found or already started.' });
    const [booked] = await pool.execute("SELECT seat_code FROM bookings WHERE showtime_id=? AND status='confirmed'", [showtimeId]);
    res.json({ showtime: times[0], seats: SEATS.map(code => ({ code, booked: booked.some(row => row.seat_code === code) })) });
  } catch (error) { next(error); }
});

module.exports = router;
