/* Quizzes page script: loads manifest, renders history, manages setup flow and quiz run. */
(function () {
  const MANIFEST_URL = 'quizzes/manifest.json';

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, children = []) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (typeof v === 'boolean') e[k] = v;
      else if (v !== undefined && v !== null) e.setAttribute(k, String(v));
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    }
    return e;
  };

  let quizzes = []; // from manifest
  let history = [];
  let activeRun = null;

  let configState = {
    difficulty: null,
    length: null, // number of categories
    categories: []
  };

  // UI Elements
  const setupView = $('#setupView');
  const activeQuizView = $('#activeQuizView');
  const diffGroup = $('#difficultyGroup');
  const lenGroup = $('#lengthGroup');
  const catGrid = $('#categoryGrid');
  const catSelectCount = $('#catSelectCount');
  const btnStart = $('#btnStartQuiz');
  const btnChooseForMe = $('#btnChooseForMe');
  const setupError = $('#setupError');
  const quizList = $('#quizList');

  function loadManifest() {
    return fetch(MANIFEST_URL, { cache: 'no-cache' })
      .then(r => r.json())
      .then(data => {
        quizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];
        loadHistory();
        renderSidebarFilters();
        resetSetup();
      })
      .catch(err => {
        console.error(err);
      });
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem('quiz.history');
      if (saved) history = JSON.parse(saved);
    } catch { }
  }
  function saveHistory() {
    try { localStorage.setItem('quiz.history', JSON.stringify(history)); } catch { }
    renderSidebarFilters();
  }
  function getCompletedQuizIds() {
    const set = new Set();
    history.forEach(h => {
      if (Array.isArray(h.sourceIds)) h.sourceIds.forEach(id => set.add(id));
    });
    return set;
  }

  // Set up the setup view bindings
  function initSetupBindings() {
    if (diffGroup) {
      diffGroup.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          diffGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          configState.difficulty = btn.dataset.val;
          configState.categories = [];
          updateCategoryGrid();
          validateSetup();
        });
      });
    }
    if (lenGroup) {
      lenGroup.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          lenGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          configState.length = parseInt(btn.dataset.val, 10);

          // If we had too many categories selected, trim them
          if (configState.categories.length > configState.length) {
            configState.categories.length = configState.length;
          }

          updateCategoryGrid();
          validateSetup();
        });
      });
    }
    if (btnChooseForMe) {
      btnChooseForMe.addEventListener('click', () => {
        if (!configState.difficulty || !configState.length) {
          showSetupError("Select difficulty and length first.");
          return;
        }
        const available = getAvailableCategories();
        if (available.length === 0) {
          showSetupError(`No unused categories for difficulty ${configState.difficulty}. Try a different difficulty.`);
          return;
        }
        // Randomly pick up to `length` categories
        const shuffled = [...available].sort(() => 0.5 - Math.random());
        configState.categories = shuffled.slice(0, configState.length);
        updateCategoryGrid();
        validateSetup();
      });
    }
    if (btnStart) {
      btnStart.addEventListener('click', startQuiz);
    }
  }

  function resetSetup() {
    activeRun = null;
    configState = { difficulty: null, length: null, categories: [] };
    if (setupView) setupView.style.display = 'block';
    if (activeQuizView) activeQuizView.style.display = 'none';

    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    updateCategoryGrid();
    validateSetup();
  }

  function getAvailableCategories() {
    if (!configState.difficulty) return [];
    const completed = getCompletedQuizIds();
    // Find all quizzes that match difficulty and are NOT completed
    const availableQuizzes = quizzes.filter(q => q.difficulty === configState.difficulty && !completed.has(q.id));
    // Extract unique categories
    const cats = new Set(availableQuizzes.map(q => q.category).filter(Boolean));
    return Array.from(cats);
  }

  function updateCategoryGrid() {
    if (!catGrid) return;
    catGrid.innerHTML = '';

    const available = getAvailableCategories();
    const allCategoriesForDiff = Array.from(new Set(quizzes.filter(q => q.difficulty === configState.difficulty).map(q => q.category).filter(Boolean)));

    if (!configState.difficulty) {
      catGrid.innerHTML = '<div style="grid-column: 1 / -1; color: var(--text-muted); padding: 20px; text-align: center;">Select a difficulty first.</div>';
    } else if (allCategoriesForDiff.length === 0) {
      catGrid.innerHTML = '<div style="grid-column: 1 / -1; color: var(--text-muted); padding: 20px; text-align: center;">No categories found for this difficulty.</div>';
    } else {
      allCategoriesForDiff.forEach(cat => {
        const isAvailable = available.includes(cat);
        const isActive = configState.categories.includes(cat);

        const btn = el('div', { class: `category-card ${!isAvailable ? 'disabled' : ''} ${isActive ? 'active' : ''}` }, [
          el('div', { style: 'font-weight: 700; font-size: 1.05rem;' }, cat),
          !isAvailable ? el('div', { style: 'font-size: 0.75rem; opacity: 0.7; margin-top: 4px;' }, 'Completed') : null
        ]);

        if (isAvailable) {
          btn.onclick = () => {
            if (isActive) {
              configState.categories = configState.categories.filter(c => c !== cat);
            } else {
              if (configState.length && configState.categories.length >= configState.length) {
                configState.categories.shift(); // rotate out the oldest one
              }
              configState.categories.push(cat);
            }
            updateCategoryGrid();
            validateSetup();
          };
        }
        catGrid.append(btn);
      });
    }

    if (catSelectCount) {
      catSelectCount.textContent = `(${configState.categories.length}/${configState.length || 0} selected)`;
    }
  }

  function validateSetup() {
    setupError.textContent = '';
    let valid = true;
    if (!configState.difficulty || !configState.length || configState.categories.length === 0) {
      valid = false;
    }
    btnStart.disabled = !valid;
  }

  function showSetupError(msg) {
    if (setupError) {
      setupError.textContent = msg;
      setTimeout(() => setupError.textContent = '', 4000);
    }
  }

  // Render Sidebar History
  function renderSidebarFilters() {
    quizList.innerHTML = '';

    const newQbBtn = el('button', { class: 'btn-primary', style: 'width: 100%; margin-bottom: 24px; padding: 16px; font-size: 1.1rem; border-radius: 12px; margin-top: 10px;', onClick: resetSetup }, 'Create New Quiz');
    quizList.append(newQbBtn);

    if (history.length === 0) {
      quizList.append(el('div', { style: 'color: var(--text-muted); text-align: center; font-size: 0.9rem;' }, 'No completed quizzes yet.'));
      return;
    }

    const groupHeader = el('div', { style: 'font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 16px;' }, 'Completed Runs');
    quizList.append(groupHeader);

    [...history].reverse().forEach((run, index) => {
      const runDate = new Date(run.timestamp).toLocaleDateString();
      const btn = el('div', { style: 'background: rgba(255,255,255,0.02); border: 1px solid transparent; color: var(--text-muted); text-align: left; padding: 16px; border-radius: 12px; margin-bottom: 12px; width: 100%; display: block;' });

      btn.append(
        el('div', { style: 'display:flex; justify-content:space-between; margin-bottom: 8px;' }, [
          el('div', { style: 'color: var(--text-main); font-weight: 600;' }, `${run.difficulty} • ${run.length} Cats`),
          el('div', { style: 'font-size: 0.8rem;' }, runDate)
        ]),
        el('div', { class: 'quiz-meta-pill' }, run.categories.join(', ')),
        el('div', { style: 'margin-top: 8px;' }, [
          el('div', { class: 'progress-bar-container', style: 'margin-bottom: 4px;' }, [
            el('div', { class: 'progress-bar', style: `width: ${run.pct}%;` })
          ]),
          el('div', { class: 'progress-stats' }, [
            el('span', {}, 'SCORE'),
            el('span', {}, `${run.correct}/${run.total} (${run.pct}%)`)
          ])
        ])
      );
      quizList.append(btn);
    });
  }

  function startQuiz() {
    btnStart.textContent = 'Loading...';
    btnStart.disabled = true;

    const targetQuizzes = [];
    const completed = getCompletedQuizIds();

    let pool = quizzes.filter(q => q.difficulty === configState.difficulty && configState.categories.includes(q.category) && !completed.has(q.id));
    let needed = configState.length;

    // First try to get at least one from each selected category
    for (const cat of configState.categories) {
      if (needed <= 0) break;
      const catQuizzes = pool.filter(q => q.category === cat);
      if (catQuizzes.length > 0) {
        const pickIdx = Math.floor(Math.random() * catQuizzes.length);
        const pick = catQuizzes[pickIdx];
        targetQuizzes.push(pick);
        pool = pool.filter(q => q.id !== pick.id);
        needed--;
      } else {
        console.error(`Missing quiz for ${cat}`);
      }
    }

    // Fill the rest randomly from the remaining pool of selected categories
    while (needed > 0 && pool.length > 0) {
      const pickIdx = Math.floor(Math.random() * pool.length);
      const pick = pool[pickIdx];
      targetQuizzes.push(pick);
      pool.splice(pickIdx, 1);
      needed--;
    }

    if (targetQuizzes.length === 0) {
      showSetupError("No quizzes could be found for the selected categories.");
      btnStart.textContent = 'Start Quiz';
      btnStart.disabled = false;
      return;
    }

    const actualCategoriesPicked = [...new Set(targetQuizzes.map(q => q.category))];

    Promise.all(targetQuizzes.map(loadQuizData)).then(results => {
      let mergedItems = [];
      results.forEach(res => {
        if (res.data.sections) {
          for (const s of res.data.sections) {
            for (const it of s.items || []) mergedItems.push({ ...it, section: res.meta.category });
          }
        }
      });

      // Shuffle items for variety
      mergedItems = mergedItems.sort(() => 0.5 - Math.random());

      activeRun = {
        sourceIds: targetQuizzes.map(q => q.id),
        difficulty: configState.difficulty,
        length: configState.length,
        categories: actualCategoriesPicked,
        items: mergedItems,
        perQ: mergedItems.map(() => ({ revealed: false, result: null })),
        currentIndex: 0,
        timestamp: Date.now()
      };

      setupView.style.display = 'none';
      activeQuizView.style.display = 'block';

      btnStart.textContent = 'Start Quiz';
      btnStart.disabled = false;

      renderCurrentState();
    }).catch(err => {
      console.error(err);
      showSetupError("Failed to load quiz data.");
      btnStart.textContent = 'Start Quiz';
      btnStart.disabled = false;
    });
  }

  function loadQuizData(meta) {
    const tryPaths = [`quizzes/${meta.file}`, `./quizzes/${meta.file}`, `${meta.file}`];
    return tryPaths.reduce((p, path) => p.catch(() => fetch(path, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    })), Promise.reject(new Error('start')))
      .then(data => ({ meta, data }));
  }

  // -------------------------------------------------------------------------------- //
  //  Quiz Run Rendering
  // -------------------------------------------------------------------------------- //

  let currentKeyHandler = null;

  function renderCurrentState() {
    if (currentKeyHandler) {
      document.removeEventListener('keydown', currentKeyHandler);
      currentKeyHandler = null;
    }

    activeQuizView.innerHTML = '';
    const list = el('div', { class: 'quiz-questions' });
    activeQuizView.append(list);

    if (activeRun.currentIndex >= activeRun.items.length) {
      renderCompletionScreen(list);
    } else {
      renderQuestion(activeRun.currentIndex, list);
    }
  }

  function calcStats() {
    const answered = activeRun.perQ.filter(x => x && x.result !== null).length;
    const correct = activeRun.perQ.filter(x => x && x.result === 'correct').length;
    const pct = answered ? Math.round((correct / answered) * 100) : 0;
    return { answered, correct, pct };
  }

  function renderCompletionScreen(list) {
    const stats = calcStats();
    const total = activeRun.items.length;

    let message = 'Good effort!';
    if (stats.pct >= 90) message = 'Excellent work!';
    else if (stats.pct >= 70) message = 'Great job!';
    else if (stats.pct < 40) message = 'Keep practicing!';

    const comp = el('div', { class: 'completion-screen' }, [
      el('h3', { style: 'margin-top:0; font-size: 2.5rem; color: white;' }, 'Quiz Complete!'),
      el('div', { class: 'completion-score' }, `${stats.pct}%`),
      el('p', { style: 'font-size: 1.2rem; margin-bottom: 20px;' }, `You got ${stats.correct} out of ${total} correct.`),
      el('h4', { style: 'margin: 10px 0 40px; color: var(--accent); font-weight: 500;' }, message),
      el('div', { style: 'display:flex; justify-content:center; gap:16px;' }, [
        el('button', { class: 'btn-primary', onClick: () => resetSetup() }, 'Create New Quiz')
      ])
    ]);
    list.append(comp);

    // Save to history on first completion
    if (!activeRun.saved) {
      activeRun.saved = true;
      history.push({
        sourceIds: activeRun.sourceIds,
        difficulty: activeRun.difficulty,
        length: activeRun.length,
        categories: activeRun.categories,
        total: total,
        correct: stats.correct,
        pct: stats.pct,
        timestamp: Date.now()
      });
      saveHistory();
    }
  }

  function renderQuestion(idx, list) {
    const qa = activeRun.items[idx];
    const state = activeRun.perQ[idx];
    const type = qa.type || 'self-eval';
    const isAnswered = state.result !== null;

    const card = el('div', { class: 'question-card active' });
    const metaText = `Question ${idx + 1} of ${activeRun.items.length}${qa.section ? ' • ' + qa.section : ''}`;

    const prevBtnContent = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px; height:16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>`;

    let prevBtn = null;
    if (idx > 0) {
      prevBtn = el('button', {
        class: 'btn-back',
        style: 'background:none; border:none; color:var(--text-muted); cursor:pointer; padding:4px; display:flex; align-items:center; opacity:0.6; transition:opacity 0.2s;',
        onClick: () => { activeRun.currentIndex = idx - 1; renderCurrentState(); },
        onMouseOver: (e) => e.currentTarget.style.opacity = '1',
        onMouseOut: (e) => e.currentTarget.style.opacity = '0.6'
      });
      prevBtn.innerHTML = prevBtnContent;
    } else {
      prevBtn = el('span', { class: 'dot' });
    }

    const stats = calcStats();

    const metaRow = el('div', { class: 'question-meta-row', style: 'display:flex; align-items:center; width: 100%; margin-bottom: 24px;' }, [
      el('div', { style: 'display:flex; align-items:center; gap:12px; flex: 1;' }, [
        prevBtn,
        el('span', {}, metaText)
      ]),
      el('div', { style: 'color: var(--text-muted); font-size: 0.85rem; font-weight: 600; font-family: var(--font-head); letter-spacing: 0.5px;' }, `SCORE ${stats.correct} / ${stats.answered} • ${stats.pct}%`)
    ]);

    const h3 = el('h3', {});
    h3.innerHTML = qa.q;

    card.append(metaRow, h3);

    let revealBtn, correctBtn, wrongBtn, nextBtn;

    currentKeyHandler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (type === 'self-eval') {
        if (!state.revealed && e.code === 'Space') {
          e.preventDefault();
          if (revealBtn) revealBtn.click();
        } else if (state.revealed && !isAnswered) {
          if (e.code === 'ArrowRight' || e.code === 'KeyC') {
            e.preventDefault();
            if (correctBtn) correctBtn.click();
          } else if (e.code === 'ArrowLeft' || e.code === 'KeyX') {
            e.preventDefault();
            if (wrongBtn) wrongBtn.click();
          }
        } else if (isAnswered) {
          if (e.code === 'ArrowRight' || e.code === 'Space') {
            e.preventDefault();
            if (nextBtn) nextBtn.click();
          }
        }
      } else {
        if (!isAnswered) {
          let optionIndex = -1;
          if (e.code.startsWith('Digit') && e.code.length === 6) optionIndex = parseInt(e.code.charAt(5)) - 1;
          else if (e.code.startsWith('Key')) {
            const char = e.code.charAt(3);
            if (char >= 'A' && char <= 'Z') optionIndex = char.charCodeAt(0) - 65;
          }

          if (type === 'true-false') {
            if (e.code === 'KeyT') optionIndex = qa.options.findIndex(o => o.toLowerCase() === 'true');
            if (e.code === 'KeyF') optionIndex = qa.options.findIndex(o => o.toLowerCase() === 'false');
          }

          if (optionIndex >= 0 && optionIndex < qa.options.length) {
            e.preventDefault();
            const buttons = card.querySelectorAll('.mc-option');
            if (buttons[optionIndex]) buttons[optionIndex].click();
          }
        } else if (isAnswered && (e.code === 'ArrowRight' || e.code === 'Space')) {
          e.preventDefault();
          if (nextBtn) nextBtn.click();
        }
      }
    };
    document.addEventListener('keydown', currentKeyHandler);

    if (type === 'multiple-choice' || type === 'true-false') {
      const optionsGrid = el('div', { class: 'mc-options' });
      const options = qa.options || [];

      options.forEach((opt, oIdx) => {
        const letter = String.fromCharCode(65 + oIdx);
        let hotkeyHint = letter;
        if (type === 'true-false') hotkeyHint = opt.toLowerCase() === 'true' ? 'T' : 'F';

        const btn = el('button', { class: 'mc-option' }, [
          el('span', { class: 'mc-option-label' }, [
            letter,
            el('span', { class: 'mc-option-hint' }, hotkeyHint)
          ]),
          el('span', {}, opt)
        ]);

        if (isAnswered) {
          btn.disabled = true;
          if (opt === qa.a) btn.classList.add('correct');
          else if (state.selectedOption === opt) btn.classList.add('wrong');
        } else {
          btn.onclick = () => {
            state.selectedOption = opt;
            state.result = (opt === qa.a) ? 'correct' : 'wrong';
            state.revealed = true;
            activeRun.perQ[idx] = state;
            renderCurrentState();
          };
        }
        optionsGrid.append(btn);
      });
      card.append(optionsGrid);
    } else {
      const actionsContainer = el('div', { class: 'self-eval-actions' });

      if (!state.revealed) {
        revealBtn = el('button', { class: 'btn-reveal' }, [
          'Reveal Answer',
          el('span', { class: 'kbd-hint' }, 'Space')
        ]);
        revealBtn.onclick = () => {
          state.revealed = true;
          activeRun.perQ[idx] = state;
          renderCurrentState();
        };
        actionsContainer.append(revealBtn);
        card.append(actionsContainer);
      } else {
        if (!isAnswered) {
          wrongBtn = el('button', { class: 'btn-incorrect' }, [
            'Incorrect',
            el('span', { class: 'kbd-hint' }, 'X')
          ]);
          wrongBtn.onclick = () => {
            state.result = 'wrong';
            activeRun.perQ[idx] = state;
            activeRun.currentIndex = idx + 1;
            renderCurrentState();
          };

          correctBtn = el('button', { class: 'btn-correct' }, [
            'Correct & Next',
            el('span', { class: 'kbd-hint' }, 'C')
          ]);
          correctBtn.onclick = () => {
            state.result = 'correct';
            activeRun.perQ[idx] = state;
            activeRun.currentIndex = idx + 1;
            renderCurrentState();
          };

          actionsContainer.append(wrongBtn, correctBtn);
          card.append(actionsContainer);
        }

        const ans = el('div', { class: 'answer-box' });
        ans.innerHTML = qa.a;
        card.append(ans);
      }
    }

    if ((isAnswered || state.revealed) && qa.explanation) {
      const exp = el('div', { class: 'explanation-box' }, [
        el('strong', {}, 'Explanation'),
        el('span', {}, qa.explanation)
      ]);
      card.append(exp);
    }

    nextBtn = el('button', {
      class: 'btn-primary',
      disabled: !isAnswered && (type !== 'self-eval' || !state.result),
      onClick: () => { activeRun.currentIndex = idx + 1; renderCurrentState(); }
    }, idx === activeRun.items.length - 1 ? 'Finish Quiz' : 'Next Question');

    if (type === 'multiple-choice' || type === 'true-false' || isAnswered) {
      let resultTag = null;
      if (isAnswered) {
        if (state.result === 'correct') resultTag = el('span', { class: 'tag-correct', style: 'margin-right: auto;' }, 'Correct');
        if (state.result === 'wrong') resultTag = el('span', { class: 'tag-wrong', style: 'margin-right: auto;' }, 'Incorrect');
      }

      card.append(el('div', { class: 'quiz-footer' }, resultTag ? [resultTag, nextBtn] : [nextBtn]));
    }

    list.append(card);
  }

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    initSetupBindings();
    loadManifest();
  });
})();
