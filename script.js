/**
 * QuizMaster - Interactive Utilities & Config Engine (script.js)
 * Concise, readable, and retains all features (presets, summary, theme, auth, filters).
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Dark / Light Theme Toggle
  const savedTheme = localStorage.getItem('quizmaster_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    themeBtn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('quizmaster_theme', next);
      themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
    };
  }

  // 2. Navbar Authentication State
  const authContainer = document.getElementById('authNavContainer');
  const user = JSON.parse(localStorage.getItem('quizmaster_user') || 'null');
  if (authContainer) {
    if (user && user.name) {
      authContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 0.85rem; font-weight: 600; color: var(--primary);">👤 ${user.name}</span>
          <button type="button" id="logoutBtn" class="btn btn-outline btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;">Logout</button>
        </div>
      `;
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          localStorage.removeItem('quizmaster_user');
          window.location.reload();
        };
      }
    } else {
      authContainer.innerHTML = `<a href="login.html" class="btn btn-outline btn-sm">Login</a>`;
    }
  }

  // 3. Quiz Configurator & Real-time Live Summary (quiz.html)
  const form = document.getElementById('assessmentForm');
  if (form) {
    const sumSubject = document.getElementById('summarySubject');
    const sumDiff = document.getElementById('summaryDifficulty');
    const sumCount = document.getElementById('summaryCount');
    const sumPacing = document.getElementById('summaryPacing');
    const perQOpts = document.getElementById('perQuestionOptions');
    const totalOpts = document.getElementById('totalTimeOptions');

    // Pre-select subject from URL query parameter if present (e.g. quiz.html?subject=javascript)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const initialSubject = urlParams.get('subject');
      if (initialSubject) {
        const radio = form.querySelector(`input[name="subject"][value="${initialSubject}"]`);
        if (radio) radio.checked = true;
      }
    } catch (e) {
      console.warn('Could not parse URL params', e);
    }

    const subjectMap = {
      mixed: 'Mixed Knowledge & Tech',
      computers: 'Computer Science & IT',
      html: 'HTML5 & Web Semantics',
      css: 'CSS3 & Responsive Layouts',
      javascript: 'Modern JavaScript (ES6+)',
      react: 'React & Frontend Components',
      oops: 'OOPs & Software Architecture',
      logic_reasoning: 'Mathematics & Logic',
      gadgets: 'Modern Gadgets & Tech',
      general: 'General Knowledge'
    };

    function updateSummary() {
      const sub = form.querySelector('input[name="subject"]:checked')?.value || 'mixed';
      const diff = form.querySelector('input[name="difficulty"]:checked')?.value || 'mixed';
      const count = form.querySelector('input[name="question_count"]:checked')?.value || '40';
      const mode = form.querySelector('input[name="timer_mode"]:checked')?.value || 'per_question';

      if (sumSubject) sumSubject.textContent = subjectMap[sub] || sub;
      if (sumDiff) sumDiff.textContent = diff.toUpperCase();
      if (sumCount) sumCount.textContent = `${count} Questions`;

      if (mode === 'per_question') {
        if (perQOpts) perQOpts.style.display = 'flex';
        if (totalOpts) totalOpts.style.display = 'none';
        const perQ = form.querySelector('input[name="per_q_time"]:checked')?.value || '60';
        if (sumPacing) sumPacing.textContent = perQ === '0' ? 'Untimed Practice' : `${perQ}s / question`;
      } else {
        if (perQOpts) perQOpts.style.display = 'none';
        if (totalOpts) totalOpts.style.display = 'flex';
        const total = form.querySelector('input[name="total_test_time"]:checked')?.value || '25';
        if (sumPacing) sumPacing.textContent = `${total} Mins total`;
      }
    }

    form.addEventListener('change', updateSummary);
    updateSummary();

    // Quick Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.onclick = () => {
        const preset = btn.getAttribute('data-preset');
        const setVal = (name, val) => {
          const radio = form.querySelector(`input[name="${name}"][value="${val}"]`);
          if (radio) radio.checked = true;
        };

        if (preset === 'trivia40') {
          setVal('subject', 'mixed'); setVal('difficulty', 'mixed'); setVal('question_count', '40');
          setVal('timer_mode', 'per_question'); setVal('per_q_time', '60');
        } else if (preset === 'rapid') {
          setVal('subject', 'mixed'); setVal('difficulty', 'easy'); setVal('question_count', '10');
          setVal('timer_mode', 'per_question'); setVal('per_q_time', '30');
        } else if (preset === 'mock') {
          setVal('subject', 'mixed'); setVal('difficulty', 'medium'); setVal('question_count', '40');
          setVal('timer_mode', 'total_test'); setVal('total_test_time', '25');
        } else if (preset === 'tech') {
          setVal('subject', 'computers'); setVal('difficulty', 'medium'); setVal('question_count', '40');
          setVal('timer_mode', 'per_question'); setVal('per_q_time', '60');
        }
        updateSummary();
      };
    });
  }

  // 4. Study Notes Search & Filter (prepare.html)
  const searchInput = document.getElementById('videoSearchInput');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.video-card');

  if (cards.length > 0) {
    let activeCat = 'all';
    let query = '';

    const applyFilters = () => {
      cards.forEach(card => {
        const cat = card.getAttribute('data-category') || '';
        const txt = card.textContent.toLowerCase();
        const matchCat = activeCat === 'all' || cat.includes(activeCat);
        const matchQuery = !query || txt.includes(query);
        card.style.display = (matchCat && matchQuery) ? 'flex' : 'none';
      });
    };

    filterBtns.forEach(btn => {
      btn.onclick = () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCat = btn.getAttribute('data-filter') || 'all';
        applyFilters();
      };
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        query = e.target.value.toLowerCase().trim();
        applyFilters();
      });
    }
  }

  // 5. Modern Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '🟢';
    if (type === 'warning') icon = '⚠️';
    toast.innerHTML = `<span style="font-size: 1.1rem;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 6. BOM & DOM Feature Layer (Homepage Interactive Architecture)
  // Feature A: Local Storage Returning Visitor (BOM)
  const heroStartBtn = document.getElementById('heroStartBtn');
  const returningBadgeContainer = document.getElementById('returningBadgeContainer');
  const hasVisited = localStorage.getItem('quizmaster_visited');
  const history = JSON.parse(localStorage.getItem('quizmaster_history') || '[]');
  const savedUser = JSON.parse(localStorage.getItem('quizmaster_user') || 'null');

  if (hasVisited || history.length > 0 || (savedUser && savedUser.name)) {
    if (heroStartBtn) {
      heroStartBtn.textContent = 'Continue Quiz →';
    }
    if (returningBadgeContainer && !returningBadgeContainer.hasChildNodes()) {
      const name = savedUser && savedUser.name ? savedUser.name : 'Learner';
      returningBadgeContainer.innerHTML = `
        <div class="returning-visitor-badge">
          <span>✨</span> Welcome back, ${name}! Progress remembered.
        </div>
      `;
    }
  }
  // Record visit
  localStorage.setItem('quizmaster_visited', 'true');

  const cardLocalStorage = document.getElementById('cardLocalStorage');
  if (cardLocalStorage) {
    cardLocalStorage.addEventListener('click', () => {
      const attempts = history.length;
      showToast(`💾 LocalStorage: Active. ${attempts} previous quiz attempt(s) recorded.`, 'success');
    });
  }

  // Feature B: Network Status (BOM)
  window.addEventListener('online', () => {
    showToast('🟢 Connection restored! Live question APIs active.', 'success');
  });
  window.addEventListener('offline', () => {
    showToast('⚠️ You are currently offline. Offline practice drills ready.', 'warning');
  });

  const cardNetworkStatus = document.getElementById('cardNetworkStatus');
  if (cardNetworkStatus) {
    cardNetworkStatus.addEventListener('click', () => {
      const status = navigator.onLine ? 'Online 🟢' : 'Offline ⚠️';
      showToast(`🌐 Browser Network Status: ${status} (BOM API)`, navigator.onLine ? 'success' : 'warning');
    });
  }

  // Feature C: Native Share (BOM)
  const cardNativeShare = document.getElementById('cardNativeShare');
  if (cardNativeShare) {
    cardNativeShare.addEventListener('click', async () => {
      const shareData = {
        title: 'QuizMaster - Technical & Aptitude Practice',
        text: 'Master technical skills and placement aptitude with timed practice drills!',
        url: window.location.href
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          showToast('🚀 QuizMaster shared successfully!', 'success');
        } catch (err) {
          if (err.name !== 'AbortError') {
            fallbackCopyLink();
          }
        }
      } else {
        fallbackCopyLink();
      }
    });

    function fallbackCopyLink() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showToast('📋 Quiz link copied to clipboard!', 'info');
        }).catch(() => {
          showToast('🔗 Quiz link: ' + window.location.href, 'info');
        });
      } else {
        showToast('🔗 Quiz link: ' + window.location.href, 'info');
      }
    }
  }

  // Feature D: DOM Updates (DOM)
  const cardDomUpdates = document.getElementById('cardDomUpdates');
  const domUpdateText = document.getElementById('domUpdateText');
  let domClickCount = 0;
  if (cardDomUpdates && domUpdateText) {
    cardDomUpdates.addEventListener('click', () => {
      domClickCount++;
      const badges = ['⚡ Realtime Rendering', '🎯 Live Question Generator', '⏱️ Dynamic Timers', '📊 Instant Score Calculation'];
      const chosenBadge = badges[domClickCount % badges.length];
      domUpdateText.innerHTML = `<strong>Active DOM Update #${domClickCount}:</strong> ${chosenBadge} injected smoothly!`;
      cardDomUpdates.style.transform = 'scale(0.98)';
      setTimeout(() => { cardDomUpdates.style.transform = ''; }, 150);
      showToast(`✨ DOM Node updated dynamically (${chosenBadge})`, 'success');
    });
  }
});
