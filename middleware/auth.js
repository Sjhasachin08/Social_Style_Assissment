// middleware/auth.js
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/database');

// In production, set JWT_SECRET via environment variable. A random fallback
// is generated per process start so tokens simply stop working (forcing
// re-login) if the server restarts without an explicit secret configured —
// safer than silently using a fixed, guessable default secret.
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const TOKEN_COOKIE = 'ssa_token';
const TOKEN_TTL = '7d';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function setAuthCookie(res, user) {
  const token = signToken(user);
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // secure: true, // enable once served over HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE);
}

/**
 * Verifies the JWT cookie and attaches the current user (without the
 * password hash) to req.user. Responds 401 if missing/invalid.
 */
function authenticate(req, res, next) {
  try {
    const token = req.cookies && req.cookies[TOKEN_COOKIE];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Please log in to continue.' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db
      .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
      .get(payload.sub);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Session is no longer valid. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access is required for this action.' });
  }
  next();
}

/**
 * Like authenticate, but never blocks the request. If a valid admin/user
 * cookie is present, req.user is populated; otherwise req.user stays
 * undefined and the request continues as an anonymous guest. Used on
 * routes that guests can hit (e.g. taking the assessment, viewing their
 * own just-submitted result) but that behave a bit differently for a
 * logged-in admin (e.g. showing edit/delete controls).
 */
function optionalAuth(req, res, next) {
  try {
    const token = req.cookies && req.cookies[TOKEN_COOKIE];
    if (!token) return next();

    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db
      .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
      .get(payload.sub);

    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  TOKEN_COOKIE
};
