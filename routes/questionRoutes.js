// routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const { getAllQuestions } = require('../controllers/questionController');

// GET /api/questions — public. Anyone can take the assessment without
// logging in; only the admin-facing report views require an account.
router.get('/', getAllQuestions);

module.exports = router;
