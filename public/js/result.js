// public/js/result.js

(function () {
  const root = document.getElementById('result-root');
  const template = document.getElementById('result-template');

  const parts = window.location.pathname.split('/').filter(Boolean);
  const assessmentId = parts[1];

  if (!assessmentId) {
    root.innerHTML = '<p>No assessment specified.</p>';
    return;
  }

  init();

  async function init() {
    // No login required to view a result you just got a link to. If an
    // admin happens to be logged in, they additionally get edit/delete.
    const user = await getCurrentUser();

    try {
      const data = await apiRequest(`/api/assessments/${assessmentId}`);
      render(data.assessment, data.style, user);
    } catch {
      root.innerHTML = '<p>We could not load this result. It may not exist.</p>';
    }
  }

  function render(assessment, style, user) {
    const clone = template.content.cloneNode(true);

    setText(clone, 'participant-name', assessment.participant_name);
    setText(clone, 'assertiveness-total', `${assessment.assertiveness_total}`);
    setText(clone, 'assertiveness-average', assessment.assertiveness_average);
    setText(clone, 'responsiveness-total', `${assessment.responsiveness_total}`);
    setText(clone, 'responsiveness-average', assessment.responsiveness_average);
    setText(clone, 'social-style', assessment.social_style);
    setText(clone, 'description', style.description);
    setText(clone, 'description-hi', style.description_hi);
    setText(clone, 'example-scenario', style.example_scenario);
    setText(clone, 'example-scenario-hi', style.example_scenario_hi);

    fillList(clone, 'strengths', style.strengths);
    fillList(clone, 'strengths-hi', style.strengths_hi);
    fillList(clone, 'improvement-suggestions', style.improvement_suggestions);
    fillList(clone, 'improvement-suggestions-hi', style.improvement_suggestions_hi);

    const styleRefCards = clone.querySelectorAll('.style-ref-card');
    styleRefCards.forEach((card) => {
      if (card.dataset.styleName === assessment.social_style) {
        card.classList.add('is-your-style');
      }
    });

    const pdfLink = clone.querySelector('[data-field="pdf-link"]');
    pdfLink.setAttribute('href', `/api/assessments/${assessment.id}/pdf`);

    if (user && user.role === 'admin') {
      const adminActions = clone.querySelector('[data-field="admin-actions"]');
      adminActions.style.display = '';

      clone.querySelector('[data-field="edit-btn"]').addEventListener('click', () => editParticipant(assessment));
      clone.querySelector('[data-field="delete-btn"]').addEventListener('click', () => deleteThisAssessment(assessment.id));
    }

    root.innerHTML = '';
    root.appendChild(clone);

    positionMatrixPoint(assessment.assertiveness_average, assessment.responsiveness_average, assessment.social_style);
  }

  async function editParticipant(assessment) {
    const newName = prompt('Participant name:', assessment.participant_name);
    if (newName === null) return;
    const newEmail = prompt('Participant email:', assessment.participant_email);
    if (newEmail === null) return;

    try {
      await apiRequest(`/api/assessments/${assessment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: newName, participantEmail: newEmail })
      });
      showToast('Participant details updated.');
      init();
    } catch {
      // apiRequest already shows an error toast
    }
  }

  async function deleteThisAssessment(id) {
    if (!confirm('Delete this assessment result permanently? This cannot be undone.')) return;
    try {
      await apiRequest(`/api/assessments/${id}`, { method: 'DELETE' });
      showToast('Assessment deleted.');
      window.location.href = '/history';
    } catch {
      // apiRequest already shows an error toast
    }
  }

  function setText(scope, field, value) {
    const el = scope.querySelector(`[data-field="${field}"]`);
    if (el) el.textContent = value;
  }

  function fillList(scope, field, jsonStr) {
    const el = scope.querySelector(`[data-field="${field}"]`);
    if (!el) return;
    let items = [];
    try {
      items = JSON.parse(jsonStr);
    } catch {
      items = [];
    }
    el.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  }

  function positionMatrixPoint(assertivenessAvg, responsivenessAvg, socialStyle) {
    const point = document.getElementById('matrix-point');
    if (!point) return;

    const clamp = (v) => Math.min(4, Math.max(1, v));
    // Horizontal: Low Assertive (1, left) -> High Assertive (4, right)
    const xPct = ((clamp(assertivenessAvg) - 1) / 3) * 100;
    // Vertical: Low Responsive (1, top) -> High Responsive (4, bottom) — matches the reference chart's orientation.
    const yPct = ((clamp(responsivenessAvg) - 1) / 3) * 100;

    point.style.left = `${xPct}%`;
    point.style.top = `${yPct}%`;
    point.title = `Your Score\nAssertiveness: ${assertivenessAvg}\nResponsiveness: ${responsivenessAvg}\nStyle: ${socialStyle}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
