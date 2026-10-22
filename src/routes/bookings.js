const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  const showtimeId = Number(req.body.showtimeId);
  const seatCode = String(req.body.seatCode || '').trim().toUpperCase();
  if (!Number.isSafeInteger(showtimeId) || showtimeId < 1) return res.status(400).json({ error: 'A valid showtimeId is required.' });
  if (!/^[A-H](?:[1-9]|10)$/.test(seatCode)) return res.status(400).json({ error: 'Choose a valid seat from A1 to H10.' });
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [times] = await connection.execute('SELECT id,starts_at FROM showtimes WHERE id=? FOR UPDATE', [showtimeId]);
    if (!times.length || new Date(times[0].starts_at) <= new Date()) {
      await connection.rollback();
      return res.status(404).json({ error: 'Showtime not found or already started.' });
    }
    const [existing] = await connection.execute("SELECT id FROM bookings WHERE showtime_id=? AND seat_code=? AND status='confirmed' FOR UPDATE", [showtimeId, seatCode]);
    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'That seat has already been booked. Please choose another seat.' });
    }
    const [insert] = await connection.execute('INSERT INTO bookings (user_id,showtime_id,seat_code,status) VALUES (?,?,?,\'confirmed\')', [req.user.id, showtimeId, seatCode]);
    await connection.commit();
    res.status(201).json({ message: 'Booking confirmed.', booking: { id: insert.insertId, showtimeId, seatCode, status: 'confirmed' } });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That seat has already been booked. Please choose another seat.' });
    next(error);
  } finally { if (connection) connection.release(); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const [bookings] = await pool.execute(
      `SELECT b.id,b.seat_code,b.status,b.created_at,s.starts_at,s.screen_name,s.ticket_price,m.id AS movie_id,m.title,m.poster_url
       FROM bookings b JOIN showtimes s ON s.id=b.showtime_id JOIN movies m ON m.id=s.movie_id
       WHERE b.user_id=? AND b.status='confirmed' ORDER BY b.created_at DESC`, [req.user.id]);
    res.json({ bookings });
  } catch (error) { next(error); }
});

const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.bookingId);
    if (!Number.isSafeInteger(bookingId) || bookingId < 1) return res.status(400).json({ error: 'Invalid booking id.' });
    const [result] = await pool.execute("DELETE FROM bookings WHERE id=? AND user_id=?", [bookingId, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Active booking not found.' });
    res.json({ message: 'Booking cancelled and removed.' });
  } catch (error) { next(error); }
};

router.patch('/:bookingId/cancel', requireAuth, cancelBooking);
router.delete('/:bookingId', requireAuth, cancelBooking);

module.exports = router;
