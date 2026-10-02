// public/js/history.js

(function () {
  const root = document.getElementById('history-root');
  const subtitle = document.getElementById('history-subtitle');

  init();

  async function init() {
    // Reports list is admin-only — participants never have accounts, so
    // this is purely the "which gmail got which report" admin view.
    const user = await requireAuth({ adminOnly: true });
    if (!user) return;

    if (subtitle) {
      subtitle.textContent = 'Every submitted report is listed below, by participant email.';
    }

    try {
      const assessments = await apiRequest('/api/assessments');
      render(assessments);
    } catch {
      root.innerHTML = '<p>Failed to load assessment history.</p>';
    }
  }

  function render(assessments) {
    if (!assessments || assessments.length === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <p>No assessments have been completed yet.</p>
          <a class="btn btn-primary" href="/assessment">Start Your First Assessment</a>
        </div>`;
      return;
    }

    const rows = assessments
      .map((a) => {
        const date = new Date(a.created_at).toLocaleString();
        const styleClass = (a.social_style || '').toLowerCase();
        return `
          <tr>
            <td data-label="Participant">${escapeHtml(a.participant_name)}</td>
            <td data-label="Gmail / Email">${escapeHtml(a.participant_email)}</td>
            <td data-label="Date">${date}</td>
            <td data-label="Assertiveness">${a.assertiveness_average}</td>
            <td data-label="Responsiveness">${a.responsiveness_average}</td>
            <td data-label="Social Style"><span class="style-pill ${styleClass}">${escapeHtml(a.social_style)}</span></td>
            <td data-label="Actions">
              <div class="table-actions">
                <a class="btn btn-secondary btn-sm" href="/result/${a.id}">View</a>
                <a class="btn btn-secondary btn-sm" href="/api/assessments/${a.id}/pdf">PDF</a>
                <button class="btn btn-danger btn-sm" data-delete-id="${a.id}">Delete</button>
              </div>
            </td>
          </tr>`;
      })
      .join('');

    root.innerHTML = `
      <table class="history-table">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Gmail / Email</th>
            <th>Date</th>
            <th>Assertiveness</th>
            <th>Responsiveness</th>
            <th>Social Style</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    root.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => deleteAssessment(btn.getAttribute('data-delete-id')));
    });
  }

  async function deleteAssessment(id) {
    if (!confirm('Delete this assessment result permanently? This cannot be undone.')) return;
    try {
      await apiRequest(`/api/assessments/${id}`, { method: 'DELETE' });
      showToast('Assessment deleted.');
      init();
    } catch {
      // apiRequest already shows an error toast
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
