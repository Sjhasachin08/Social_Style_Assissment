// controllers/authController.js
const bcrypt = require('bcryptjs');
const { getDb } = require('../database/database');
const { setAuthCookie, clearAuthCookie } = require('../middleware/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function sanitizeText(value, maxLen = 255) {
  return typeof value === 'string' ? value.trim().slice(0, maxLen) : '';
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/**
 * POST /api/auth/login
 * Admin-only in practice: regular participants never have accounts, since
 * public self-signup has been removed. Only the seeded admin (or any admin
 * created directly in the DB) can log in.
 */
function login(req, res) {
  try {
    const db = getDb();
    const { email, password } = req.body || {};
    const cleanEmail = sanitizeText(email).toLowerCase();

    if (!isValidEmail(cleanEmail) || typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    setAuthCookie(res, user);
    res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to log in.' });
  }
}

function logout(req, res) {
  clearAuthCookie(res);
  res.json({ success: true, data: null });
}

function me(req, res) {
  res.json({ success: true, data: publicUser(req.user) });
}

module.exports = { login, logout, me };
