// controllers/userController.js
// Admin-only: list / edit / delete user accounts.
const bcrypt = require('bcryptjs');
const { getDb } = require('../database/database');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function sanitizeText(value, maxLen = 255) {
  return typeof value === 'string' ? value.trim().slice(0, maxLen) : '';
}

function listUsers(req, res) {
  try {
    const db = getDb();
    const users = db
      .prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC, id DESC')
      .all();
    res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load users.' });
  }
}

/**
 * PUT /api/users/:id
 * Admin can edit a user's name, email, role, and optionally reset password.
 */
function updateUser(req, res) {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { name, email, role, password } = req.body || {};

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updates = {};

    if (name !== undefined) {
      const cleanName = sanitizeText(name);
      if (!cleanName) return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
      updates.name = cleanName;
    }

    if (email !== undefined) {
      const cleanEmail = sanitizeText(email).toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'A valid email address is required.' });
      }
      const dup = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(cleanEmail, id);
      if (dup) return res.status(409).json({ success: false, message: 'Another account already uses this email.' });
      updates.email = cleanEmail;
    }

    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ success: false, message: "Role must be 'admin' or 'user'." });
      }
      if (existing.role === 'admin' && role !== 'admin') {
        const adminCount = db.prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'admin'`).get().count;
        if (adminCount <= 1) {
          return res.status(400).json({ success: false, message: 'Cannot remove the last remaining admin.' });
        }
      }
      updates.role = role;
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      }
      updates.password_hash = bcrypt.hashSync(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    const setClause = Object.keys(updates)
      .map((k) => `${k} = @${k}`)
      .join(', ');
    db.prepare(`UPDATE users SET ${setClause} WHERE id = @id`).run({ ...updates, id });

    const updated = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
}

/**
 * DELETE /api/users/:id
 * Cannot delete your own account or the last remaining admin.
 * Assessments belonging to the deleted user are kept (user_id becomes NULL)
 * so historical results are not silently destroyed.
 */
function deleteUser(req, res) {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (existing.role === 'admin') {
      const adminCount = db.prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'admin'`).get().count;
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last remaining admin.' });
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true, data: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
}

module.exports = { listUsers, updateUser, deleteUser };
