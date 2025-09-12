/* Quizzes page script: loads manifest, renders list, and loads a quiz on selection. */
(function () {
  const MANIFEST_URL = 'quizzes/manifest.json';
  const FALLBACK_MANIFEST = {
    version: 1,
    quizzes: [
      { id: '50-Question-gk-1', title: 'General Knowledge (50)', description: 'Challenging mix across 5 sections.', file: '50-Question-gk-1.json' },
      { id: '50-Question-gk-2', title: 'General Knowledge Quiz 2 (50 Questions)', description: 'Challenging but fair mix of pop culture, history, science, geography, and technology.', file: '50-Question-gk-2.json' },
      { id: '50-Question-gk-3', title: 'General Knowledge Quiz 3 (50 Questions)', description: 'Challenging trivia across pop culture, history, science, geography, and technology.', file: '50-Question-gk-3.json' },
      { id: '50-Question-gk-4', title: 'General Knowledge Quiz 4 (50 Questions)', description: 'Challenging trivia across pop culture, history, science, geography, and technology.', file: '50-Question-gk-4.json' },
      { id: '50-Question-gk-5', title: 'General Knowledge Quiz 5 (50 Questions)', description: 'Challenging trivia across pop culture, history, science, geography, and technology.', file: '50-Question-gk-5.json' }
    ]
  };

  // Embedded fallback quiz data for local-file usage or offline
  const FALLBACK_QUIZ_DATA = {
    '50-Question-gk-1.json': {
      id: '50-Question-gk-1',
      title: 'Harder General Knowledge Quiz (50 Questions)',
      description: 'Challenging but fair across pop culture, history, science, geography, and tech.',
      sections: [
        { title: 'Pop Culture & Entertainment', items: [
          { q: 'Which Beatle crossed Abbey Road barefoot?', a: 'Paul McCartney' },
          { q: 'In <em>The Matrix</em>, does Neo take the red pill or the blue pill to learn the truth?', a: 'Red pill' },
          { q: 'Who won the first season of <em>American Idol</em>?', a: 'Kelly Clarkson' },
          { q: 'What year did the original <em>Pac‑Man</em> arcade game release?', a: '1980' },
          { q: 'Which actor played both Magneto and Gandalf?', a: 'Ian McKellen' },
          { q: 'Who was the first rapper to win a Pulitzer Prize for Music?', a: 'Kendrick Lamar (<em>DAMN.</em>, 2018)' },
          { q: 'What film did Steven Spielberg win his first Oscar for Best Director?', a: "<em>Schindler's List</em> (1993)" },
          { q: 'Which Shakespeare play features Rosencrantz and Guildenstern?', a: '<em>Hamlet</em>' },
          { q: 'What TV show coined the phrase ‘Winter is Coming’? ', a: '<em>Game of Thrones</em>' },
          { q: 'Who painted the ceiling of the Sistine Chapel?', a: 'Michelangelo' },
        ] },
        { title: 'History & Politics', items: [
          { q: 'What year did the United States land Apollo 11 on the Moon?', a: '1969' },
          { q: 'Which U.S. president served the shortest time in office?', a: 'William Henry Harrison (31 days)' },
          { q: 'Who was the last Tsar of Russia?', a: 'Nicholas II' },
          { q: "The Hundred Years' War was primarily fought between which two countries?", a: 'England and France' },
          { q: 'Who delivered the famous ‘I Have a Dream’ speech?', a: 'Martin Luther King Jr.' },
          { q: 'What country gifted the Statue of Liberty to the U.S.?', a: 'France' },
          { q: 'Which empire was ruled by Genghis Khan?', a: 'The Mongol Empire' },
          { q: "The Cuban Missile Crisis happened during which U.S. president's term?", a: 'John F. Kennedy' },
          { q: 'What year did women gain the right to vote in the U.S.?', a: '1920' },
          { q: 'Who was the British Prime Minister during most of World War II?', a: 'Winston Churchill' },
        ] },
        { title: 'Science & Nature', items: [
          { q: 'What element has the chemical symbol ‘Na’? ', a: 'Sodium' },
          { q: 'Which part of the cell contains genetic material?', a: 'Nucleus' },
          { q: 'What is the rarest blood type in humans?', a: 'AB‑negative' },
          { q: 'How many teeth does a normal adult human have?', a: '32' },
          { q: 'Which scientist developed the three laws of motion?', a: 'Isaac Newton' },
          { q: 'What organelle is called the ‘powerhouse of the cell’? ', a: 'Mitochondria' },
          { q: 'Which element is liquid at room temperature: mercury or sodium?', a: 'Mercury' },
          { q: 'What is the only mammal capable of true flight?', a: 'Bat' },
          { q: "What is the main gas found in Earth's atmosphere?", a: 'Nitrogen (~78%)' },
          { q: 'Which natural phenomenon is measured by the Richter scale?', a: 'Earthquakes' },
        ] },
        { title: 'Geography', items: [
          { q: 'What is the capital of Canada?', a: 'Ottawa' },
          { q: 'Which African country was formerly called Abyssinia?', a: 'Ethiopia' },
          { q: 'What river flows through Paris?', a: 'Seine' },
          { q: 'What is the largest island in the world (not counting continents)?', a: 'Greenland' },
          { q: 'Which country has the most natural lakes?', a: 'Canada' },
          { q: 'In which European city would you find the Acropolis?', a: 'Athens' },
          { q: 'Which desert covers much of Mongolia and northern China?', a: 'Gobi Desert' },
          { q: 'What line of latitude runs through the center of Earth?', a: 'The Equator' },
          { q: 'Which mountain range separates Europe and Asia?', a: 'The Ural Mountains' },
          { q: 'What country has the most time zones?', a: 'France (due to overseas territories)' },
        ] },
        { title: 'Technology & Everyday Life', items: [
          { q: 'What does HTTP stand for?', a: 'HyperText Transfer Protocol' },
          { q: 'What company developed the first mass‑market computer mouse?', a: 'Xerox' },
          { q: 'What year was the first iPhone released?', a: '2007' },
          { q: 'What does GPS stand for?', a: 'Global Positioning System' },
          { q: 'What is the name of the first man‑made satellite launched into space?', a: 'Sputnik 1' },
          { q: 'In computing, what does ‘GUI’ stand for?', a: 'Graphical User Interface' },
          { q: 'What video game console introduced the character Sonic the Hedgehog?', a: 'Sega Genesis / Mega Drive' },
          { q: 'What was the first video uploaded to YouTube?', a: '‘Me at the zoo’' },
          { q: 'What company created the Walkman?', a: 'Sony' },
          { q: 'What year was Google founded?', a: '1998' },
        ] }
      ]
    }
  };

  /** @typedef {{ id: string, title: string, description?: string, file: string }} QuizMeta */
  /** @typedef {{ id: string, title: string, description?: string, sections: { title?: string, items: { q: string, a: string }[] }[] }} QuizData */

  /** DOM helpers */
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, children = []) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== undefined && v !== null) e.setAttribute(k, String(v));
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    }
    return e;
  };

  /** State */
  /** @type {QuizMeta[]} */
  let quizzes = [];
  /** @type {QuizMeta | null} */
  let active = null; // important: default is not selected
  /** Cache totals per quiz id */
  const totalsCache = new Map(); // id -> total question count

  function loadManifest() {
    return fetch(MANIFEST_URL, { cache: 'no-cache' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load manifest');
        return r.json();
      })
      .then(data => {
        quizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];
        renderList();
      })
      .catch(err => {
        console.warn('Falling back to embedded quizzes manifest', err);
        quizzes = FALLBACK_MANIFEST.quizzes;
        renderList();
      });
  }

  function renderList() {
    const list = $('#quizList');
    if (!list) return;
    list.innerHTML = '';
    if (quizzes.length === 0) {
      list.append(el('div', { class: 'quiz-card' }, 'No quizzes available yet.'));
      return;
    }

    for (const q of quizzes) {
      const btn = el('button', { class: 'glass', 'data-quiz-item': q.id }, [
        el('div', { class: '', }, [
          el('div', {}, [el('strong', {}, q.title)]),
          q.description ? el('div', { class: 'pill-mono', style: 'margin-top:6px; display:inline-block' }, q.description) : null,
        ]),
        el('div', { style: 'margin-top:10px;' }, [
          el('div', { class: 'progress-outer small' }, [ el('div', { class: 'progress-inner', 'data-list-bar': q.id }) ]),
          el('div', { style: 'display:flex; justify-content:space-between; margin-top:6px; font-size:12px; opacity:0.9;' }, [
            el('span', { 'data-list-count': q.id }, ''),
            el('span', { 'data-list-pct': q.id }, ''),
          ])
        ])
      ]);
      if (active && active.id === q.id) btn.classList.add('active');
      btn.addEventListener('click', () => selectQuiz(q.id));
      list.append(btn);
      // compute/update progress for each quiz item
      updateListProgress(q);
      ensureQuizTotal(q).then(() => updateListProgress(q)).catch(() => {});
    }
  }

  function updateListProgress(q) {
    const storageKey = `quiz.state.${q.id}`;
    let perQ = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) perQ = JSON.parse(saved);
    } catch {}
    const totalKnown = totalsCache.get(q.id) || (Array.isArray(perQ) ? perQ.length : 0) || 0;
    const correct = Array.isArray(perQ) ? perQ.filter(x => x && x.result === 'correct').length : 0;
    const pct = totalKnown ? Math.round((correct / totalKnown) * 100) : 0;

    const countEl = document.querySelector(`[data-list-count="${q.id}"]`);
    const pctEl = document.querySelector(`[data-list-pct="${q.id}"]`);
    const barEl = document.querySelector(`[data-list-bar="${q.id}"]`);
    if (countEl) countEl.textContent = `${correct}/${totalKnown} correct`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (barEl) barEl.style.width = `${pct}%`;
  }

  function flattenCountFromData(quizData) {
    let count = 0;
    for (const s of quizData.sections || []) count += (s.items || []).length;
    return count;
  }

  function ensureQuizTotal(meta) {
    if (totalsCache.has(meta.id)) return Promise.resolve(totalsCache.get(meta.id));
    return loadQuiz(meta).then(data => {
      const total = flattenCountFromData(data);
      totalsCache.set(meta.id, total);
      return total;
    }).catch(() => {
      // fallback to any stored perQ length as a last resort
      try {
        const saved = localStorage.getItem(`quiz.state.${meta.id}`);
        if (saved) {
          const perQ = JSON.parse(saved);
          if (Array.isArray(perQ)) {
            const total = perQ.length;
            totalsCache.set(meta.id, total);
            return total;
          }
        }
      } catch {}
      return 0;
    });
  }

  function selectQuiz(id) {
    const meta = quizzes.find(q => q.id === id) || null;
    active = meta;
    renderList();
    if (!meta) return;
    loadQuiz(meta).then(renderQuiz).catch(err => {
      console.error(err);
      const detail = $('#quizDetail');
      if (!detail) return;
      detail.innerHTML = '';
      detail.append(
        el('div', { class: 'quiz-card' }, [
          el('strong', {}, 'Error loading quiz'),
          el('p', {}, 'Could not load the selected quiz.'),
        ])
      );
    });
  }

  /** @param {QuizMeta} meta */
  function loadQuiz(meta) {
    const tryPaths = [
      `quizzes/${meta.file}`,
      `./quizzes/${meta.file}`,
      `${meta.file}`
    ];
    // Try network fetch paths sequentially; on total failure, fall back to embedded data
    return tryPaths.reduce((p, path) => p.catch(() => fetch(path, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error('Failed to load quiz at ' + path);
      return r.json();
    })), Promise.reject(new Error('start'))).catch(err => {
      if (FALLBACK_QUIZ_DATA[meta.file]) {
        console.warn('Using embedded fallback for quiz', meta.file);
        return FALLBACK_QUIZ_DATA[meta.file];
      }
      throw err;
    });
  }

  /** @param {QuizData} quiz */
  function renderQuiz(quiz) {
    const detail = $('#quizDetail');
    if (!detail) return;

    // Flatten questions
    const items = [];
    for (const s of quiz.sections || []) {
      for (const it of s.items || []) items.push({ ...it, section: s.title || '' });
    }

    const storageId = (active && active.id) || quiz.id;
    const storageKey = `quiz.state.${storageId}`;
    /** @type {{ revealed: boolean, result: 'correct'|'wrong'|null }[]} */
    let perQ = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) perQ = JSON.parse(saved);
    } catch {}
    if (!Array.isArray(perQ) || perQ.length !== items.length) {
      perQ = items.map(() => ({ revealed: false, result: null }));
    }

    function persist() {
      try { localStorage.setItem(storageKey, JSON.stringify(perQ)); } catch {}
      updateHeader();
      updateListProgress({ id: quiz.id });
    }

    function calcStats() {
      const answered = perQ.filter(x => x.result === 'correct' || x.result === 'wrong').length;
      const correct = perQ.filter(x => x.result === 'correct').length;
      const pct = items.length ? Math.round((correct / items.length) * 100) : 0;
      const pctWidth = items.length ? `${Math.round((answered / items.length) * 100)}%` : '0%';
      return { answered, correct, pct, pctWidth };
    }

    function updateHeader() {
      const { correct, pct, pctWidth } = calcStats();
      $('#quiz-progress-count')?.replaceChildren(`${correct}/${items.length} correct`);
      const bar = $('#quiz-progress-bar');
      if (bar) bar.style.width = pctWidth;
      $('#quiz-progress-pct')?.replaceChildren(`${pct}%`);
    }

    // removed subheader UI

    function resetAll() {
      perQ = items.map(() => ({ revealed: false, result: null }));
      persist();
      renderQuestions();
    }

    detail.innerHTML = '';
    const header = el('div', { class: 'quiz-card', style: 'margin-bottom:12px;' }, [
      el('div', { style: 'display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;' }, [
        el('div', {}, [
          el('h2', { style: 'margin:0 0 6px 0;' }, quiz.title),
          quiz.description ? el('div', { class: 'pill-mono', style: 'display:inline-block;' }, quiz.description) : null,
        ]),
        el('div', { class: 'quiz-actions' }, [
          el('button', { class: 'btn-slim', onClick: () => resetAll() }, 'Reset progress')
        ])
      ]),
      el('div', { style: 'margin-top:10px;' }, [
        el('div', { class: 'progress-outer' }, [ el('div', { id: 'quiz-progress-bar', class: 'progress-inner' }) ]),
        el('div', { style: 'display:flex; justify-content:space-between; margin-top:6px; font-size:12px; opacity:0.9;' }, [
          el('span', { id: 'quiz-progress-count' }, ''),
          el('span', { id: 'quiz-progress-pct' }, ''),
        ])
      ])
    ]);

    const list = el('div', { class: 'quiz-questions' });

    function renderQuestions() {
      list.innerHTML = '';
      items.forEach((qa, idx) => {
        const state = perQ[idx] || { revealed: false, result: null };
        const tags = el('div', { style: 'display:flex; gap:6px; align-items:center;' });
        if (state.result === 'correct') tags.append(el('span', { class: 'pill-mono tag-correct' }, 'Correct'));
        if (state.result === 'wrong') tags.append(el('span', { class: 'pill-mono tag-wrong' }, 'Wrong'));

        const body = el('div', { class: 'question-card' }, [
          el('div', { style: 'display:flex; align-items:flex-start; justify-content:space-between; gap:10px; flex-wrap:wrap;' }, [
            el('div', {}, [
              el('div', { style: 'font-size:12px; opacity:0.8; text-transform:uppercase;' }, `Question ${idx + 1}${qa.section ? ' • ' + qa.section : ''}`),
              (() => { const d = el('div', { style: 'margin-top:4px;' }); d.innerHTML = qa.q; return d; })(),
            ]),
            tags
          ]),
          el('div', { class: 'quiz-actions', style: 'margin-top:10px;' }, [
            el('button', { class: `btn-slim btn-toggle${state.revealed ? ' active' : ''}`, 'aria-pressed': state.revealed ? 'true' : 'false', onClick: () => { state.revealed = !state.revealed; perQ[idx] = state; persist(); renderQuestions(); } }, state.revealed ? 'Hide answer' : 'Reveal answer'),
            el('button', { class: `btn-slim btn-good${state.result === 'correct' ? ' active' : ''}`, 'aria-pressed': state.result === 'correct' ? 'true' : 'false', onClick: () => { state.result = 'correct'; perQ[idx] = state; persist(); renderQuestions(); } }, 'I got it right'),
            el('button', { class: `btn-slim btn-bad${state.result === 'wrong' ? ' active' : ''}`, 'aria-pressed': state.result === 'wrong' ? 'true' : 'false', onClick: () => { state.result = 'wrong'; perQ[idx] = state; persist(); renderQuestions(); } }, 'I got it wrong'),
          ]),
          state.revealed ? (() => { const a = el('div', { class: 'answer' }); a.innerHTML = qa.a; return a; })() : null
        ]);
        list.append(body);
      });
      updateHeader();
    }

    renderQuestions();
    detail.append(header, list);
    updateHeader();
  }

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    loadManifest();
  });
})();
