// services/scoringService.js
// All scoring logic lives here. The frontend never sends scores/averages/style —
// only { questionId, selectedScore } pairs. This service looks up each question's
// category in SQLite and performs every calculation server-side.

const MIDPOINT = 2.5;

/**
 * Sum the selected scores for a given category.
 * @param {Array<{category: string, selected_score: number}>} answersWithCategory
 * @param {string} category 'assertiveness' | 'responsiveness'
 */
function calculateAssertiveness(answersWithCategory) {
  return answersWithCategory
    .filter((a) => a.category === 'assertiveness')
    .reduce((sum, a) => sum + a.selected_score, 0);
}

function calculateResponsiveness(answersWithCategory) {
  return answersWithCategory
    .filter((a) => a.category === 'responsiveness')
    .reduce((sum, a) => sum + a.selected_score, 0);
}

function calculateAverage(total, count) {
  if (!count) return 0;
  return Math.round((total / count) * 100) / 100;
}

function determineSocialStyle(assertivenessAvg, responsivenessAvg) {
  if (assertivenessAvg < MIDPOINT && responsivenessAvg < MIDPOINT) return 'Analytical';
  if (assertivenessAvg >= MIDPOINT && responsivenessAvg < MIDPOINT) return 'Driver';
  if (assertivenessAvg < MIDPOINT && responsivenessAvg >= MIDPOINT) return 'Amiable';
  return 'Expressive';
}

/**
 * Full pipeline: given answers already joined with their question category,
 * and the count of questions per category, compute totals/averages/style.
 */
function calculateAssessment(answersWithCategory, assertivenessCount, responsivenessCount) {
  const assertivenessTotal = calculateAssertiveness(answersWithCategory);
  const responsivenessTotal = calculateResponsiveness(answersWithCategory);

  const assertivenessAverage = calculateAverage(assertivenessTotal, assertivenessCount);
  const responsivenessAverage = calculateAverage(responsivenessTotal, responsivenessCount);

  const socialStyle = determineSocialStyle(assertivenessAverage, responsivenessAverage);

  return {
    assertivenessTotal,
    assertivenessAverage,
    responsivenessTotal,
    responsivenessAverage,
    socialStyle
  };
}

module.exports = {
  MIDPOINT,
  calculateAssessment,
  calculateAssertiveness,
  calculateResponsiveness,
  calculateAverage,
  determineSocialStyle
};
