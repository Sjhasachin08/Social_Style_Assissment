// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public self-signup has been removed — regular participants never need an
// account to take the assessment. Only the seeded admin account (and any
// admin created directly in the DB) can log in, to view/manage reports.
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
