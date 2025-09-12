/* Quizzes page script: loads manifest, renders list, and loads a quiz on selection. */
(function () {
  const MANIFEST_URL = 'quizzes/manifest.json';

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
  /** @type {{ id: string, title: string, description?: string, file: string }[]} */
  let quizzes = [];
  /** @type {{ id: string, title: string, description?: string, file: string } | null } */
  let active = null; // default: not selected
  const totalsCache = new Map(); // id -> total count

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
        console.error(err);
        quizzes = [];
        const list = $('#quizList');
        if (list) {
          list.innerHTML = '';
          list.append(
            el('div', { class: 'quiz-card' }, [
              el('strong', {}, 'Error loading quizzes'),
              el('p', {}, 'Could not load the quizzes manifest.'),
            ])
          );
        }
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
        el('div', {}, [
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

  function loadQuiz(meta) {
    const tryPaths = [
      `quizzes/${meta.file}`,
      `./quizzes/${meta.file}`,
      `${meta.file}`
    ];
    return tryPaths.reduce((p, path) => p.catch(() => fetch(path, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error('Failed to load quiz at ' + path);
      return r.json();
    })), Promise.reject(new Error('start')));
  }

  function renderQuiz(quiz) {
    const detail = $('#quizDetail');
    if (!detail) return;

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

