/**
 * QuizMaster - Assessment Arena Engine (arena.js)
 * Retains all features: live API fetching, palette navigation, timers, review breakdown, and history tracking.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Read Query Parameters
  const params = new URLSearchParams(window.location.search);
  const subject = params.get('subject') || 'mixed';
  const difficulty = params.get('difficulty') || 'mixed';
  const count = parseInt(params.get('question_count'), 10) || 10;
  const timerMode = params.get('timer_mode') || 'per_question';
  const perQTime = parseInt(params.get('per_q_time'), 10) || 60;
  const totalMinutes = parseInt(params.get('total_test_time'), 10) || 15;
  const apiKey = params.get('api_key') || localStorage.getItem('quizapi_key') || '';

  // 2. DOM Elements
  const loadingState = document.getElementById('loadingState');
  const quizLayout = document.getElementById('quizLayout');
  const subjectBadge = document.getElementById('subjectBadge');
  const questionCounter = document.getElementById('questionCounter');
  const timerDigits = document.getElementById('timerDigits');
  const questionTitle = document.getElementById('questionTitle');
  const optionsList = document.getElementById('optionsList');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const paletteGrid = document.getElementById('paletteGrid');
  const progressFill = document.getElementById('progressFill');
  const resultModal = document.getElementById('resultModal');

  // 3. Quiz State
  let questions = [];
  let currentIndex = 0;
  let userAnswers = [];
  let timeLeft = timerMode === 'per_question' ? perQTime : totalMinutes * 60;
  let timerId = null;

  if (subjectBadge) subjectBadge.textContent = subject.replace('_', ' ').toUpperCase();

  // 4. Fetch Questions via API with Fallbacks
  async function fetchQuestions() {
    try {
      if (apiKey) {
        // Fetch from QuizAPI.io
        let tag = '';
        if (subject === 'html') tag = 'HTML';
        else if (subject === 'css') tag = 'CSS';
        else if (subject === 'javascript') tag = 'JavaScript';
        else if (subject === 'react') tag = 'React';
        else if (subject === 'oops') tag = 'PHP';

        let url = `https://quizapi.io/api/v1/questions?apiKey=${apiKey}&limit=${count}`;
        if (tag) url += `&tags=${tag}`;
        if (difficulty !== 'mixed') url += `&difficulty=${difficulty}`;

        const res = await fetch(url);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          questions = data.map(item => {
            const opts = [];
            let correctIdx = 0;
            const keys = ['answer_a', 'answer_b', 'answer_c', 'answer_d'];
            keys.forEach((k, i) => {
              if (item.answers[k]) {
                opts.push(item.answers[k]);
                if (item.correct_answers[k + '_correct'] === 'true') correctIdx = opts.length - 1;
              }
            });
            return {
              question: item.question,
              options: opts.length >= 2 ? opts : ['True', 'False'],
              answer: correctIdx,
              explanation: item.explanation || `Category: ${item.category || 'Tech'} | Difficulty: ${item.difficulty || 'Standard'}`
            };
          });
          return startAssessment();
        }
      }

      // Public Live API: Open Trivia DB (Computers)
      const diffParam = difficulty !== 'mixed' ? `&difficulty=${difficulty.toLowerCase()}` : '';
      const fallbackUrl = `https://opentdb.com/api.php?amount=${count}&category=18${diffParam}&type=multiple`;
      const res = await fetch(fallbackUrl);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        questions = data.results.map(item => {
          const incorrect = item.incorrect_answers.map(decodeHtml);
          const correct = decodeHtml(item.correct_answer);
          const opts = [...incorrect, correct].sort(() => Math.random() - 0.5);
          return {
            question: decodeHtml(item.question),
            options: opts,
            answer: opts.indexOf(correct),
            explanation: `Correct Answer: ${correct} (Category: ${decodeHtml(item.category)})`
          };
        });
        startAssessment();
      } else {
        useOfflineQuestions();
      }
    } catch (err) {
      console.warn('API fetch failed, using backup questions:', err);
      useOfflineQuestions();
    }
  }

  function useOfflineQuestions() {
    questions = [
      { question: "Which HTML5 tag is used to specify a navigation section?", options: ["<nav>", "<header>", "<navigate>", "<menu>"], answer: 0, explanation: "<nav> is the semantic container for primary navigation links." },
      { question: "Which CSS property is used to create a flex container?", options: ["display: flex", "box-sizing: border-box", "position: relative", "float: left"], answer: 0, explanation: "display: flex defines a flex container for children." },
      { question: "What is the return type of typeof NaN in JavaScript?", options: ["'number'", "'nan'", "'undefined'", "'object'"], answer: 0, explanation: "In JS, NaN is technically a numeric type representing Not-a-Number." },
      { question: "Which React Hook performs side effects in function components?", options: ["useState", "useEffect", "useMemo", "useCallback"], answer: 1, explanation: "useEffect runs lifecycle side effects like data fetching and timers." },
      { question: "Which OOP concept enables a class to derive features from another class?", options: ["Encapsulation", "Polymorphism", "Inheritance", "Abstraction"], answer: 2, explanation: "Inheritance allows a child class to inherit fields and methods." }
    ];
    startAssessment();
  }

  function decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  // 5. Start Assessment Session
  function startAssessment() {
    userAnswers = new Array(questions.length).fill(null);
    if (loadingState) loadingState.style.display = 'none';
    if (quizLayout) quizLayout.style.display = 'grid';
    buildPalette();
    renderQuestion(0);
    startTimer();
  }

  // 6. Question Palette Navigation
  function buildPalette() {
    if (!paletteGrid) return;
    paletteGrid.innerHTML = '';
    questions.forEach((_, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-btn';
      btn.textContent = idx + 1;
      btn.onclick = () => renderQuestion(idx);
      paletteGrid.appendChild(btn);
    });
  }

  // 7. Render Current Question
  function renderQuestion(index) {
    currentIndex = index;
    const q = questions[currentIndex];
    if (!q) return;

    if (questionCounter) questionCounter.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
    if (progressFill) progressFill.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
    if (questionTitle) questionTitle.textContent = q.question;

    // Render Options
    if (optionsList) {
      optionsList.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      q.options.forEach((optText, optIdx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn' + (userAnswers[currentIndex] === optIdx ? ' selected' : '');
        btn.textContent = `${letters[optIdx] || optIdx + 1}. ${optText}`;
        btn.onclick = () => {
          userAnswers[currentIndex] = optIdx;
          renderQuestion(currentIndex);
        };
        optionsList.appendChild(btn);
      });
    }

    // Action Buttons
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) {
      nextBtn.textContent = (currentIndex === questions.length - 1) ? 'Submit Assessment ✓' : 'Next Question →';
    }

    // Update Palette active & answered states
    document.querySelectorAll('.palette-btn').forEach((btn, pIdx) => {
      btn.classList.toggle('active', pIdx === currentIndex);
      btn.classList.toggle('answered', userAnswers[pIdx] !== null);
    });

    // Reset countdown for per-question timer mode
    if (timerMode === 'per_question' && perQTime > 0) timeLeft = perQTime;
  }

  // 8. Timer System
  function startTimer() {
    if (timerMode === 'per_question' && perQTime <= 0) {
      if (timerDigits) timerDigits.textContent = 'Untimed';
      return;
    }

    clearInterval(timerId);
    timerId = setInterval(() => {
      timeLeft--;
      const mins = String(Math.floor(Math.max(timeLeft, 0) / 60)).padStart(2, '0');
      const secs = String(Math.max(timeLeft, 0) % 60).padStart(2, '0');

      if (timerDigits) {
        timerDigits.textContent = `${mins}:${secs}`;
        timerDigits.classList.toggle('timer-danger', timeLeft <= 10);
      }

      if (timeLeft <= 0) {
        if (timerMode === 'per_question' && currentIndex < questions.length - 1) {
          renderQuestion(currentIndex + 1);
        } else {
          finishAssessment();
        }
      }
    }, 1000);
  }

  // 9. Finish Assessment & Build Detailed Review
  function finishAssessment() {
    clearInterval(timerId);

    let score = 0;
    questions.forEach((q, i) => {
      if (userAnswers[i] === q.answer) score++;
    });

    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    // Save to Local History
    try {
      const history = JSON.parse(localStorage.getItem('quizmaster_history') || '[]');
      const user = JSON.parse(localStorage.getItem('quizmaster_user') || 'null');
      history.unshift({
        id: Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        subject: subject.replace('_', ' ').toUpperCase(),
        difficulty: difficulty.toUpperCase(),
        score: score,
        total: total,
        percentage: percentage,
        user: user ? user.name : 'Guest Student'
      });
      localStorage.setItem('quizmaster_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history:', e);
    }

    // Modal UI Updates
    const modalScore = document.getElementById('modalScore');
    const modalBadge = document.getElementById('modalBadge');
    const modalTitle = document.getElementById('modalTitle');
    const modalFeedback = document.getElementById('modalFeedback');

    if (modalScore) modalScore.textContent = `${score} / ${total} (${percentage}%)`;
    if (modalBadge) modalBadge.textContent = percentage >= 80 ? '🌟' : percentage >= 50 ? '👍' : '📚';
    if (modalTitle) modalTitle.textContent = percentage >= 80 ? 'Exemplary Score!' : percentage >= 50 ? 'Assessment Complete!' : 'Study Reinforcement Needed';
    if (modalFeedback) {
      modalFeedback.textContent = percentage >= 80
        ? 'Superb performance! You are well prepared for campus technical tests.'
        : percentage >= 50
        ? 'Solid practice attempt. Review explanations below to sharpen your speed.'
        : 'Review the study notes and retake this drill to master foundational concepts.';
    }

    // Populate Detailed Answer Review
    const reviewList = document.getElementById('reviewList');
    if (reviewList) {
      reviewList.innerHTML = '';
      questions.forEach((q, idx) => {
        const isCorrect = userAnswers[idx] === q.answer;
        const userChoice = userAnswers[idx] !== null ? q.options[userAnswers[idx]] : 'Unanswered';
        const correctChoice = q.options[q.answer];

        const item = document.createElement('div');
        item.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;
        item.innerHTML = `
          <h4>Q${idx + 1}. ${q.question}</h4>
          <div style="display: flex; gap: 1rem; margin: 0.3rem 0; font-size: 0.82rem;">
            <span>Your: <strong style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">${userChoice}</strong></span>
            <span>Correct: <strong style="color: var(--success);">${correctChoice}</strong></span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${q.explanation}</div>
        `;
        reviewList.appendChild(item);
      });
    }

    if (resultModal) resultModal.classList.add('open');
  }

  // 10. Navigation Listeners
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentIndex > 0) renderQuestion(currentIndex - 1);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentIndex < questions.length - 1) {
        renderQuestion(currentIndex + 1);
      } else {
        finishAssessment();
      }
    };
  }

  // Keyboard navigation (Arrow keys)
  document.addEventListener('keydown', (e) => {
    if (resultModal && resultModal.classList.contains('open')) return;
    if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
      renderQuestion(currentIndex + 1);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      renderQuestion(currentIndex - 1);
    }
  });

  // Start initial API load
  fetchQuestions();
});
