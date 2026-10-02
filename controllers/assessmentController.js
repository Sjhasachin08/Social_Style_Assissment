// controllers/assessmentController.js
const { getDb, runInTransaction } = require('../database/database');
const scoringService = require('../services/scoringService');
const { generateAssessmentPdf } = require('../services/pdfService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim().slice(0, 255) : '';
}

/**
 * POST /api/assessments
 * Body: { participantName, participantEmail, answers: [{ questionId, selectedScore }] }
 * Backend performs ALL validation and scoring — never trusts scores/averages/style from the client.
 */
function createAssessment(req, res) {
  try {
    const db = getDb();
    const { answers, participantName, participantEmail } = req.body || {};

    // No login/signup required to take the assessment — the participant's
    // name and email are collected at the end of the quiz and submitted
    // directly with the answers. If an admin happens to be logged in while
    // submitting (rare), we still tag the record with their user_id.
    const name = sanitizeText(participantName);
    const email = sanitizeText(participantEmail).toLowerCase();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid Gmail/email address is required.' });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'Answers are required.' });
    }

    // Load active questions to validate against and to look up category server-side.
    const questions = db
      .prepare('SELECT id, category FROM questions WHERE active = 1')
      .all();
    const questionMap = new Map(questions.map((q) => [q.id, q.category]));

    const assertivenessCount = questions.filter((q) => q.category === 'assertiveness').length;
    const responsivenessCount = questions.filter((q) => q.category === 'responsiveness').length;
    const expectedTotal = assertivenessCount + responsivenessCount;

    if (answers.length !== expectedTotal) {
      return res.status(400).json({
        success: false,
        message: `All ${expectedTotal} questions must be answered. Received ${answers.length}.`
      });
    }

    const seenQuestionIds = new Set();
    const answersWithCategory = [];

    for (const raw of answers) {
      const questionId = Number(raw && raw.questionId);
      const selectedScore = Number(raw && raw.selectedScore);

      if (!Number.isInteger(questionId) || !questionMap.has(questionId)) {
        return res.status(400).json({ success: false, message: `Invalid question id: ${raw && raw.questionId}` });
      }
      if (seenQuestionIds.has(questionId)) {
        return res.status(400).json({ success: false, message: `Duplicate answer for question id: ${questionId}` });
      }
      if (!Number.isInteger(selectedScore) || selectedScore < 1 || selectedScore > 4) {
        return res.status(400).json({
          success: false,
          message: `Score for question ${questionId} must be an integer between 1 and 4.`
        });
      }

      seenQuestionIds.add(questionId);
      answersWithCategory.push({
        questionId,
        selected_score: selectedScore,
        category: questionMap.get(questionId)
      });
    }

    if (seenQuestionIds.size !== questionMap.size) {
      return res.status(400).json({ success: false, message: 'All active questions must be answered exactly once.' });
    }

    // Backend-only calculation.
    const result = scoringService.calculateAssessment(
      answersWithCategory,
      assertivenessCount,
      responsivenessCount
    );

    const insertAssessment = db.prepare(`
      INSERT INTO assessments
        (user_id, participant_name, participant_email, assertiveness_total, assertiveness_average,
         responsiveness_total, responsiveness_average, social_style)
      VALUES (@user_id, @participant_name, @participant_email, @assertiveness_total, @assertiveness_average,
              @responsiveness_total, @responsiveness_average, @social_style)
    `);

    const insertAnswer = db.prepare(`
      INSERT INTO assessment_answers (assessment_id, question_id, selected_score)
      VALUES (@assessment_id, @question_id, @selected_score)
    `);

    const assessmentId = runInTransaction(db, () => {
      const info = insertAssessment.run({
        user_id: req.user ? req.user.id : null,
        participant_name: name,
        participant_email: email,
        assertiveness_total: result.assertivenessTotal,
        assertiveness_average: result.assertivenessAverage,
        responsiveness_total: result.responsivenessTotal,
        responsiveness_average: result.responsivenessAverage,
        social_style: result.socialStyle
      });

      const id = info.lastInsertRowid;

      for (const a of answersWithCategory) {
        insertAnswer.run({
          assessment_id: id,
          question_id: a.questionId,
          selected_score: a.selected_score
        });
      }

      return id;
    });

    const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId);

    res.status(201).json({ success: true, data: assessment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit assessment.' });
  }
}

/**
 * POST /api/assessments/:id/answers
 * Allows recording additional answers against an existing assessment record
 * (e.g. corrections/appends) and recalculates totals/averages/style from
 * the full stored answer set. Kept for API completeness alongside the
 * primary single-shot submission flow above.
 */
function addAnswers(req, res) {
  try {
    const db = getDb();
    const assessmentId = Number(req.params.id);
    const { answers } = req.body || {};

    const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'Answers are required.' });
    }

    const questions = db.prepare('SELECT id, category FROM questions WHERE active = 1').all();
    const questionMap = new Map(questions.map((q) => [q.id, q.category]));
    const assertivenessCount = questions.filter((q) => q.category === 'assertiveness').length;
    const responsivenessCount = questions.filter((q) => q.category === 'responsiveness').length;

    const upsert = db.prepare(`
      INSERT INTO assessment_answers (assessment_id, question_id, selected_score)
      VALUES (@assessment_id, @question_id, @selected_score)
    `);
    const deleteExisting = db.prepare(
      'DELETE FROM assessment_answers WHERE assessment_id = ? AND question_id = ?'
    );

    runInTransaction(db, () => {
      for (const raw of answers) {
        const questionId = Number(raw && raw.questionId);
        const selectedScore = Number(raw && raw.selectedScore);

        if (!Number.isInteger(questionId) || !questionMap.has(questionId)) {
          throw new Error(`Invalid question id: ${raw && raw.questionId}`);
        }
        if (!Number.isInteger(selectedScore) || selectedScore < 1 || selectedScore > 4) {
          throw new Error(`Score for question ${questionId} must be an integer between 1 and 4.`);
        }

        deleteExisting.run(assessmentId, questionId);
        upsert.run({ assessment_id: assessmentId, question_id: questionId, selected_score: selectedScore });
      }

      const storedAnswers = db
        .prepare(
          `SELECT aa.selected_score, q.category
           FROM assessment_answers aa
           JOIN questions q ON q.id = aa.question_id
           WHERE aa.assessment_id = ?`
        )
        .all(assessmentId)
        .map((r) => ({ selected_score: r.selected_score, category: r.category }));

      const result = scoringService.calculateAssessment(storedAnswers, assertivenessCount, responsivenessCount);

      db.prepare(
        `UPDATE assessments SET
           assertiveness_total = ?, assertiveness_average = ?,
           responsiveness_total = ?, responsiveness_average = ?,
           social_style = ?
         WHERE id = ?`
      ).run(
        result.assertivenessTotal,
        result.assertivenessAverage,
        result.responsivenessTotal,
        result.responsivenessAverage,
        result.socialStyle,
        assessmentId
      );
    });

    const updated = db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update answers.' });
  }
}

function getAssessmentById(req, res) {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id);

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }
    // Public by design: this is the link a guest lands on right after
    // submitting the assessment (no account to check ownership against).

    const styleInfo = db.prepare('SELECT * FROM social_styles WHERE name = ?').get(assessment.social_style);

    // Individual answers are included so an admin can review/edit a result
    // in detail without a separate endpoint.
    const answers = db
      .prepare(
        `SELECT aa.question_id, aa.selected_score, q.category, q.left_option, q.right_option
         FROM assessment_answers aa
         JOIN questions q ON q.id = aa.question_id
         WHERE aa.assessment_id = ?
         ORDER BY q.category, q.question_number`
      )
      .all(id);

    res.json({ success: true, data: { assessment, style: styleInfo, answers } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load assessment.' });
  }
}

/**
 * GET /api/assessments
 * Admin-only report list — every submitted assessment with its participant
 * email, so the admin can see "which gmail's report is what".
 */
function getAllAssessments(req, res) {
  try {
    const db = getDb();
    const assessments = db.prepare('SELECT * FROM assessments ORDER BY created_at DESC, id DESC').all();
    res.json({ success: true, data: assessments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load assessment history.' });
  }
}

function downloadAssessmentPdf(req, res) {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id);

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const styleInfo = db.prepare('SELECT * FROM social_styles WHERE name = ?').get(assessment.social_style);

    const safeName = assessment.participant_name.replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="social_style_report_${safeName}_${id}.pdf"`);

    generateAssessmentPdf(res, assessment, styleInfo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
  }
}

/**
 * PUT /api/assessments/:id
 * Admin-only: edit participant name/email on a history record.
 */
function updateAssessment(req, res) {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { participantName, participantEmail } = req.body || {};

    const existing = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const name = participantName !== undefined ? sanitizeText(participantName) : existing.participant_name;
    const email = participantEmail !== undefined ? sanitizeText(participantEmail) : existing.participant_email;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    db.prepare('UPDATE assessments SET participant_name = ?, participant_email = ? WHERE id = ?').run(
      name,
      email,
      id
    );

    const updated = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update assessment.' });
  }
}

/**
 * DELETE /api/assessments/:id
 * Admin-only. assessment_answers rows cascade-delete via the FK constraint.
 */
function deleteAssessment(req, res) {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    const existing = db.prepare('SELECT id FROM assessments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    db.prepare('DELETE FROM assessments WHERE id = ?').run(id);
    res.json({ success: true, data: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete assessment.' });
  }
}

module.exports = {
  createAssessment,
  addAnswers,
  getAssessmentById,
  getAllAssessments,
  downloadAssessmentPdf,
  updateAssessment,
  deleteAssessment
};
