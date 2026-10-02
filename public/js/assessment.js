// public/js/assessment.js

(function () {
  const questionCard = document.getElementById('question-card');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressLabel = document.getElementById('progress-label');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');
  const emailModal = document.getElementById('email-modal');
  const emailForm = document.getElementById('email-modal-form');
  const nameInput = document.getElementById('participant-name-input');
  const emailInput = document.getElementById('participant-email-input');
  const emailModalCancel = document.getElementById('email-modal-cancel');
  const emailModalSubmit = document.getElementById('email-modal-submit');

  let questions = [];
  let currentIndex = 0;
  const answers = {}; // questionId -> selectedScore

  init();

  async function init() {
    // No login required — anyone can take the assessment straight away.
    try {
      questions = await apiRequest('/api/questions');
      if (!Array.isArray(questions) || questions.length === 0) {
        questionCard.innerHTML = '<p>No questions available. Please restart the server.</p>';
        return;
      }
      renderQuestion();
    } catch {
      questionCard.innerHTML = '<p>Failed to load the questionnaire. Please refresh the page.</p>';
    }
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    const total = questions.length;
    const answeredCount = Object.keys(answers).length;

    progressLabel.textContent = `Question ${currentIndex + 1} of ${total}`;
    progressPercent.textContent = `${Math.round(((currentIndex + 1) / total) * 100)}%`;
    progressFill.style.width = `${(answeredCount / total) * 100}%`;

    const selected = answers[q.id];
    const isResponsiveness = q.category === 'responsiveness';
    // Assertiveness rows are numbered 1→4 left-to-right on the reference form.
    // Responsiveness rows are numbered 4→1 left-to-right instead, so a high
    // total always means "high on that dimension" either way. See seed.js.
    const buttonOrder = isResponsiveness ? [4, 3, 2, 1] : [1, 2, 3, 4];

    // Label under each button, by position (left -> right), so it is always
    // obvious which end of the scale a number stands for:
    //   [left option] [often left] [often right] [right option]
    const scoreLabelsEn = [
      q.left_option,
      `Often ${q.left_option}`,
      `Often ${q.right_option}`,
      q.right_option
    ];
    const scoreLabelsHi = q.left_option_hi && q.right_option_hi
      ? [
          q.left_option_hi,
          `अक्सर ${q.left_option_hi}`,
          `अक्सर ${q.right_option_hi}`,
          q.right_option_hi
        ]
      : ['', '', '', ''];

    questionCard.innerHTML = `
      <div class="question-category">${q.category}</div>
      <div class="question-number">Question ${currentIndex + 1} / ${total}</div>
      <div class="opposites-row">
        <div class="option-block option-block-left">
          <div class="option-en">
            <span class="option-word">${escapeHtml(q.left_option)}</span>
            ${q.left_hint ? `<span class="option-example"> — ${escapeHtml(q.left_hint)}</span>` : ''}
          </div>
          ${q.left_option_hi ? `
          <div class="option-hi">
            <span class="option-word">${escapeHtml(q.left_option_hi)}</span>
            ${q.left_hint_hi ? `<span class="option-example"> — ${escapeHtml(q.left_hint_hi)}</span>` : ''}
          </div>` : ''}
        </div>
        <div class="option-block option-block-right">
          <div class="option-en">
            <span class="option-word">${escapeHtml(q.right_option)}</span>
            ${q.right_hint ? `<span class="option-example"> — ${escapeHtml(q.right_hint)}</span>` : ''}
          </div>
          ${q.right_option_hi ? `
          <div class="option-hi">
            <span class="option-word">${escapeHtml(q.right_option_hi)}</span>
            ${q.right_hint_hi ? `<span class="option-example"> — ${escapeHtml(q.right_hint_hi)}</span>` : ''}
          </div>` : ''}
        </div>
      </div>
      <div class="score-options" id="score-options">
        ${buttonOrder
          .map((val, idx) => {
            const en = scoreLabelsEn[idx];
            const hi = scoreLabelsHi[idx];
            return `
          <button type="button" class="score-option${selected === val ? ' selected' : ''}" data-value="${val}">
            <span class="score-num">${val}</span>
            <span class="score-label-en">${escapeHtml(en)}</span>
            ${hi ? `<span class="score-label-hi">${escapeHtml(hi)}</span>` : ''}
          </button>`;
          })
          .join('')}
      </div>
    `;

    document.querySelectorAll('.score-option').forEach((btn) => {
      btn.addEventListener('click', () => selectScore(q.id, Number(btn.dataset.value)));
    });

    prevBtn.disabled = currentIndex === 0;
    nextBtn.textContent = currentIndex === total - 1 ? 'Submit Assessment' : 'Next';
    nextBtn.disabled = answers[q.id] === undefined;
  }

  function selectScore(questionId, value) {
    answers[questionId] = value;
    document.querySelectorAll('.score-option').forEach((btn) => {
      btn.classList.toggle('selected', Number(btn.dataset.value) === value);
    });
    nextBtn.disabled = false;

    const total = questions.length;
    const answeredCount = Object.keys(answers).length;
    progressFill.style.width = `${(answeredCount / total) * 100}%`;
  }

  function goPrev() {
    if (currentIndex === 0) return;
    currentIndex -= 1;
    renderQuestion();
  }

  function goNext() {
    const q = questions[currentIndex];
    if (answers[q.id] === undefined) {
      showToast('Please select an answer before continuing.', true);
      return;
    }
    if (currentIndex === questions.length - 1) {
      submitAssessment();
      return;
    }
    currentIndex += 1;
    renderQuestion();
  }

  function submitAssessment() {
    const unanswered = questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      showToast(`Please answer all questions (${unanswered.length} remaining).`, true);
      return;
    }
    // Quiz is done — now ask for name + Gmail so the report can be linked
    // to the participant. Submission actually happens once that's filled in.
    openEmailModal();
  }

  function openEmailModal() {
    nameInput.value = '';
    emailInput.value = '';
    emailModal.classList.add('show');
    setTimeout(() => nameInput.focus(), 50);
  }

  function closeEmailModal() {
    emailModal.classList.remove('show');
  }

  async function finalizeSubmit(name, email) {
    emailModalSubmit.disabled = true;
    emailModalSubmit.textContent = 'Submitting…';

    const payload = {
      participantName: name,
      participantEmail: email,
      answers: questions.map((q) => ({ questionId: q.id, selectedScore: answers[q.id] }))
    };

    try {
      const assessment = await apiRequest('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      window.location.href = `/result/${assessment.id}`;
    } catch {
      emailModalSubmit.disabled = false;
      emailModalSubmit.textContent = 'See My Result';
    }
  }

  emailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    if (!name) {
      showToast('Please enter your name.', true);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid Gmail/email address.', true);
      return;
    }
    finalizeSubmit(name, email);
  });

  emailModalCancel.addEventListener('click', closeEmailModal);

  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);

  document.addEventListener('keydown', (e) => {
    if (['1', '2', '3', '4'].includes(e.key)) {
      const q = questions[currentIndex];
      if (q) selectScore(q.id, Number(e.key));
    } else if (e.key === 'ArrowRight') {
      goNext();
    } else if (e.key === 'ArrowLeft') {
      goPrev();
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();