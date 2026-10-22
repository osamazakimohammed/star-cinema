const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
  maxAge: 2 * 60 * 60 * 1000
};

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ error: 'Password must be at least 8 characters and no more than 72 UTF-8 bytes.' });
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'An account with this email already exists.' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)', [name, email, hash]);
    const user = { id: result.insertId, name, email };
    res.cookie('starCinemaSession', makeToken(user), cookieOptions);
    return res.status(201).json({ message: 'Account created successfully.', user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (Buffer.byteLength(password, 'utf8') > 72) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const [rows] = await pool.execute('SELECT id,name,email,password_hash FROM users WHERE email = ?', [email]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    const user = { id: rows[0].id, name: rows[0].name, email: rows[0].email };
    res.cookie('starCinemaSession', makeToken(user), cookieOptions);
    return res.json({ message: 'Login successful.', user });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.post('/logout', (req, res) => {
  res.clearCookie('starCinemaSession', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api'
  });
  res.json({ message: 'Logged out.' });
});

function makeToken(user) {
  return jwt.sign({ email: user.email, name: user.name }, process.env.JWT_SECRET, {
    subject: String(user.id), expiresIn: process.env.JWT_EXPIRES_IN
  });
}

module.exports = router;
