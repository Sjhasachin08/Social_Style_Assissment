// controllers/questionController.js
const { getDb } = require('../database/database');

function getAllQuestions(req, res) {
  try {
    const db = getDb();
    const questions = db
      .prepare(
        `SELECT id, category, question_number, left_option, right_option, left_option_hi, right_option_hi,
                left_hint, right_hint, left_hint_hi, right_hint_hi
         FROM questions
         WHERE active = 1
         ORDER BY category, question_number`
      )
      .all();

    res.json({ success: true, data: questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load questions.' });
  }
}

module.exports = { getAllQuestions };
