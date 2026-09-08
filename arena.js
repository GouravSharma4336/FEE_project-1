/**
 * QuizMaster - Assessment Arena Engine (arena.js)
 * Dynamically extracts questions using the Open Trivia Database API (https://opentdb.com/api.php?amount=40)
 * Features: live API fetching, category badges, palette navigation, countdown timers, review breakdown, and history tracking.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Read Query Parameters
  const params = new URLSearchParams(window.location.search);
  const subject = params.get('subject') || 'mixed';
  const difficulty = params.get('difficulty') || 'mixed';
  const count = parseInt(params.get('question_count'), 10) || 40;
  const timerMode = params.get('timer_mode') || 'per_question';
  const perQTime = parseInt(params.get('per_q_time'), 10) || 60;
  const totalMinutes = parseInt(params.get('total_test_time'), 10) || 25;

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

  if (subjectBadge) {
    subjectBadge.textContent = subject.replace('_', ' ').toUpperCase();
  }

  // 4. Fetch Questions via Open Trivia DB API (https://opentdb.com/api.php?amount=40)
  async function fetchQuestions() {
    const questionAmount = count || 40;

    // Open Trivia DB category ID mapping
    const categoryMap = {
      computers: 18,
      html: 18,
      css: 18,
      javascript: 18,
      react: 18,
      oops: 18,
      logic_reasoning: 19,
      math: 19,
      science: 17,
      gadgets: 30,
      general: 9
    };

    let targetUrl = `https://opentdb.com/api.php?amount=${questionAmount}`;
    if (categoryMap[subject]) {
      targetUrl += `&category=${categoryMap[subject]}`;
    }
    if (difficulty && difficulty !== 'mixed') {
      targetUrl += `&difficulty=${difficulty.toLowerCase()}`;
    }

    try {
      let res = await fetch(targetUrl);
      let data = await res.json();

      // Handle rate limit (response_code 5) with brief retry
      if (data && data.response_code === 5) {
        console.warn('Open Trivia DB rate-limited, waiting 2s for retry...');
        await new Promise(r => setTimeout(r, 2000));
        res = await fetch(targetUrl);
        data = await res.json();
      }

      // If specific category/difficulty returned no results (code 1), fall back to general Open Trivia DB 40 questions
      if ((!data || data.response_code !== 0 || !data.results || data.results.length === 0) && targetUrl !== `https://opentdb.com/api.php?amount=${questionAmount}`) {
        console.warn('Specific Open Trivia DB filter returned empty. Falling back to general Open Trivia DB questions.');
        res = await fetch(`https://opentdb.com/api.php?amount=${questionAmount}`);
        data = await res.json();
      }

      if (data && data.response_code === 0 && Array.isArray(data.results) && data.results.length > 0) {
        questions = data.results.map(item => {
          const cleanQuestion = decodeHtml(item.question);
          const cleanCorrect = decodeHtml(item.correct_answer);
          const cleanCategory = decodeHtml(item.category || 'General Knowledge');
          const cleanDifficulty = (item.difficulty || 'medium').toUpperCase();

          let opts = [];
          if (item.type === 'boolean') {
            opts = ['True', 'False'];
          } else {
            const cleanIncorrect = (item.incorrect_answers || []).map(decodeHtml);
            opts = shuffleArray([cleanCorrect, ...cleanIncorrect]);
          }

          return {
            question: cleanQuestion,
            options: opts,
            answer: opts.indexOf(cleanCorrect),
            category: cleanCategory,
            difficulty: cleanDifficulty,
            explanation: `Correct Answer: ${cleanCorrect} (Category: ${cleanCategory} | Level: ${cleanDifficulty})`
          };
        });

        startAssessment();
      } else {
        console.warn('Open Trivia DB did not return valid results. Using offline questions.');
        useOfflineQuestions();
      }
    } catch (err) {
      console.warn('Network or Open Trivia DB API fetch failed, using backup questions:', err);
      useOfflineQuestions();
    }
  }

  // Robust HTML entity decoder using browser DOM
  function decodeHtml(html) {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  // Safe HTML string escaper for review rendering
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Fisher-Yates shuffle algorithm for un-biased option ordering
  function shuffleArray(arr) {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Offline fallback questions in case internet is completely disconnected
  function useOfflineQuestions() {
    questions = [
      { question: "Which HTML5 element is used to specify a navigation section?", options: ["<nav>", "<header>", "<navigate>", "<menu>"], answer: 0, category: "Web Development", difficulty: "EASY", explanation: "<nav> is the semantic container for primary navigation links." },
      { question: "Which CSS property is used to create a flex container?", options: ["display: flex", "box-sizing: border-box", "position: relative", "float: left"], answer: 0, category: "Web Development", difficulty: "EASY", explanation: "display: flex defines a flex container for children." },
      { question: "What is the return type of typeof NaN in JavaScript?", options: ["'number'", "'nan'", "'undefined'", "'object'"], answer: 0, category: "Computer Science", difficulty: "MEDIUM", explanation: "In JS, NaN is technically a numeric type representing Not-a-Number." },
      { question: "Which React Hook performs side effects in function components?", options: ["useState", "useEffect", "useMemo", "useCallback"], answer: 1, category: "Computer Science", difficulty: "MEDIUM", explanation: "useEffect runs lifecycle side effects like data fetching and timers." },
      { question: "Which OOP concept enables a class to derive features from another class?", options: ["Encapsulation", "Polymorphism", "Inheritance", "Abstraction"], answer: 2, category: "Computer Science", difficulty: "EASY", explanation: "Inheritance allows a child class to inherit fields and methods." },
      { question: "In computing, what does CPU stand for?", options: ["Central Processing Unit", "Central Process Unit", "Computer Personal Unit", "Central Processor Unit"], answer: 0, category: "Computers", difficulty: "EASY", explanation: "CPU stands for Central Processing Unit." },
      { question: "Which data structure operates on a Last In First Out (LIFO) basis?", options: ["Queue", "Stack", "Array", "Linked List"], answer: 1, category: "Algorithms", difficulty: "EASY", explanation: "A Stack operates on LIFO principles." },
      { question: "What is the primary protocol used for transferring encrypted web pages?", options: ["HTTP", "HTTPS", "FTP", "SSH"], answer: 1, category: "Networks", difficulty: "EASY", explanation: "HTTPS encrypts communications over TLS/SSL." }
    ];
    startAssessment();
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
    if (subjectBadge) {
      subjectBadge.textContent = q.category ? `${q.category} • ${q.difficulty}` : subject.replace('_', ' ').toUpperCase();
    }

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
        subject: `Open Trivia (${subject.replace('_', ' ').toUpperCase()})`,
        difficulty: difficulty.toUpperCase(),
        score: score,
        total: total,
        percentage: percentage,
        user: user ? user.name : 'Student'
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
    if (modalTitle) modalTitle.textContent = percentage >= 80 ? 'Outstanding Score!' : percentage >= 50 ? 'Assessment Complete!' : 'Knowledge Reinforcement Needed';
    if (modalFeedback) {
      modalFeedback.textContent = percentage >= 80
        ? 'Superb performance! You mastered these questions from Open Trivia DB.'
        : percentage >= 50
        ? 'Solid practice attempt! Review the explanations below to refine your knowledge.'
        : 'Take some time to review the answers below and try another Open Trivia drill!';
    }

    // Populate Detailed Answer Review
    const reviewList = document.getElementById('reviewList');
    if (reviewList) {
      reviewList.innerHTML = '';
      questions.forEach((q, idx) => {
        const isCorrect = userAnswers[idx] === q.answer;
        const userChoice = userAnswers[idx] !== null ? q.options[userAnswers[idx]] : 'Unanswered';
        const correctChoice = q.options[q.answer] || 'N/A';

        const item = document.createElement('div');
        item.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;

        const qHeading = document.createElement('h4');
        qHeading.textContent = `Q${idx + 1}. ${q.question}`;

        const choiceRow = document.createElement('div');
        choiceRow.style.cssText = 'display: flex; gap: 1rem; margin: 0.3rem 0; font-size: 0.82rem; flex-wrap: wrap;';
        choiceRow.innerHTML = `
          <span>Your Answer: <strong style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">${escapeHtml(userChoice)}</strong></span>
          <span>Correct: <strong style="color: var(--success);">${escapeHtml(correctChoice)}</strong></span>
        `;

        const expl = document.createElement('div');
        expl.style.cssText = 'font-size: 0.78rem; color: var(--text-muted);';
        expl.textContent = q.explanation;

        item.appendChild(qHeading);
        item.appendChild(choiceRow);
        item.appendChild(expl);
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

  // Start Open Trivia DB API extraction
  fetchQuestions();
});
