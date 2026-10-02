// routes/assessmentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createAssessment,
  addAnswers,
  getAssessmentById,
  getAllAssessments,
  downloadAssessmentPdf,
  updateAssessment,
  deleteAssessment
} = require('../controllers/assessmentController');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

// POST /api/assessments — public. No login/signup required: anyone can take
// the assessment; the participant's name/email is submitted with the answers.
router.post('/', optionalAuth, createAssessment);

// GET /api/assessments — the full report list, keyed by participant email.
// Admin-only: this is how the admin sees "which gmail got which report".
router.get('/', authenticate, requireAdmin, getAllAssessments);

// GET /api/assessments/:id — public read of a single result (the link a
// guest lands on right after submitting). Admin gets extra edit/delete
// controls client-side when logged in.
router.get('/:id', optionalAuth, getAssessmentById);

// GET /api/assessments/:id/pdf — same access as above.
router.get('/:id/pdf', optionalAuth, downloadAssessmentPdf);

// Everything below mutates history data — admin only.
router.post('/:id/answers', authenticate, requireAdmin, addAnswers);
router.put('/:id', authenticate, requireAdmin, updateAssessment);
router.delete('/:id', authenticate, requireAdmin, deleteAssessment);

module.exports = router;
