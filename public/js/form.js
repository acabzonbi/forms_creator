const id = new URLSearchParams(location.search).get('id');
let form = null;
let submitted = false;
let answers = {};

async function loadForm() {
  const res = await fetch(`/api/forms/${id}`);
  if (!res.ok) { document.getElementById('root').innerHTML = '<p style="color:var(--error)">Форму не знайдено.</p>'; return; }
  form = await res.json();
  renderForm();
}

function renderForm() {
  const root = document.getElementById('root');
  const hasValidation = form.questions.some(q => q.correctAnswers && q.correctAnswers.length);

  root.innerHTML = `
    <div class="accent-bar"></div>
    <h1 class="page-title">${esc(form.title)}</h1>
    ${form.description ? `<p class="page-sub">${esc(form.description)}</p>` : ''}
    ${hasValidation ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <span class="badge badge-success">Форма має правильні відповіді</span>
      <label class="back-link" style="cursor:pointer;margin-bottom:0;" id="show-toggle-wrap">
        <span id="toggle-lbl">Показати відповіді</span>
        <input type="checkbox" id="show-toggle" style="display:none;" onchange="toggleShowAnswers()">
      </label>
    </div>` : ''}
    <div id="questions-wrap"></div>
    <div id="score-wrap"></div>
    <div id="actions" style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
      <button class="btn btn-primary btn-lg" id="submit-btn" onclick="submit()">Надіслати відповіді</button>
    </div>`;

  renderQuestions();
}

let showAnswers = false;
function toggleShowAnswers() {
  showAnswers = document.getElementById('show-toggle').checked;
  document.getElementById('toggle-lbl').textContent = showAnswers ? 'Сховати відповіді' : 'Показати відповіді';
  renderQuestions();
}

function renderQuestions() {
  const wrap = document.getElementById('questions-wrap');
  wrap.innerHTML = '';

  form.questions.forEach((q, qi) => {
    const div = document.createElement('div');
    div.className = 'fill-q';
    div.id = `fq-${q.id}`;

    let body = `
      <div class="q-text">${qi + 1}. ${esc(q.text)}</div>`;

    if (q.type === 'single') {
      body += `<p class="q-hint">Оберіть одну відповідь</p><div class="choices" id="ch-${q.id}">`;
      q.options.forEach(opt => {
        const isCorrect = q.correctAnswers && q.correctAnswers.includes(opt);
        const sel = answers[q.id] === opt;
        let cls = sel ? 'sel' : '';
        if (showAnswers && isCorrect) cls = 'reveal-correct';
        body += `
          <div class="choice ${cls}" onclick="selectSingle('${q.id}','${esc(opt)}')" data-opt="${esc(opt)}">
            <div class="c-dot"></div>
            <span>${esc(opt)}</span>
            ${showAnswers && isCorrect ? '<span style="margin-left:auto;font-size:11px;opacity:0.8;">✓</span>' : ''}
          </div>`;
      });
      body += `</div>`;

    } else if (q.type === 'multiple') {
      body += `<p class="q-hint">Оберіть усі правильні варіанти</p><div class="choices" id="ch-${q.id}">`;
      q.options.forEach(opt => {
        const isCorrect = q.correctAnswers && q.correctAnswers.includes(opt);
        const sel = Array.isArray(answers[q.id]) && answers[q.id].includes(opt);
        let cls = sel ? 'sel' : '';
        if (showAnswers && isCorrect) cls = 'reveal-correct';
        body += `
          <div class="choice ${cls}" onclick="selectMulti('${q.id}','${esc(opt)}')" data-opt="${esc(opt)}">
            <div class="c-dot square"></div>
            <span>${esc(opt)}</span>
            ${showAnswers && isCorrect ? '<span style="margin-left:auto;font-size:11px;opacity:0.8;">✓</span>' : ''}
          </div>`;
      });
      body += `</div>`;

    } else {
      body += `
        <input class="input" id="txt-${q.id}"
          value="${esc(answers[q.id] || '')}"
          placeholder="Ваша відповідь..."
          oninput="answers['${q.id}']=this.value">
        ${showAnswers && q.correctAnswers && q.correctAnswers.length
          ? `<div class="hint-box" style="margin-top:10px;">✓ Правильна відповідь: <strong>${esc(q.correctAnswers[0])}</strong></div>`
          : ''}`;
    }

    div.innerHTML = body;
    wrap.appendChild(div);
  });
}

function selectSingle(qId, opt) {
  if (submitted) return;
  answers[qId] = answers[qId] === opt ? null : opt;
  renderQuestions();
}

function selectMulti(qId, opt) {
  if (submitted) return;
  if (!Array.isArray(answers[qId])) answers[qId] = [];
  const idx = answers[qId].indexOf(opt);
  if (idx === -1) answers[qId].push(opt);
  else answers[qId].splice(idx, 1);
  renderQuestions();
}

async function submit() {
  if (submitted) return;

  // check all required
  for (const q of form.questions) {
    if (q.type === 'single' && !answers[q.id]) {
      toast('Дайте відповідь на всі запитання', 'err'); return;
    }
    if (q.type === 'multiple' && (!answers[q.id] || !answers[q.id].length)) {
      toast('Дайте відповідь на всі запитання', 'err'); return;
    }
    if (q.type === 'text' && !answers[q.id]) {
      toast('Дайте відповідь на всі запитання', 'err'); return;
    }
  }

  submitted = true;
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('submit-btn').textContent = 'Надсилання...';

  // build answers array
  const answersArr = form.questions.map(q => ({
    questionId: q.id,
    value: answers[q.id] || (q.type === 'text' ? '' : [])
  }));

  const res = await fetch(`/api/responses/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: answersArr })
  });

  const data = await res.json();

  const hasValidation = form.questions.some(q => q.correctAnswers && q.correctAnswers.length);
  if (hasValidation && data.score !== undefined) {
    showScore(data.score, data.maxScore);
  }

  showResults(answersArr);

  document.getElementById('actions').innerHTML = `
    <a href="/" class="btn btn-ghost">На головну</a>
    <a href="answers.html?id=${id}" class="btn btn-secondary">Переглянути всі відповіді</a>`;
}

function showScore(score, max) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
//  let emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
  const wrap = document.getElementById('score-wrap');
  wrap.innerHTML = `
    <div class="score-panel">
      
      <div class="score-big">${score}/${max}</div>
      <div class="score-lbl">правильних відповідей · ${pct}%</div>
      <div class="score-bar-bg"><div class="score-bar" id="sbar"></div></div>
    </div>`;
  setTimeout(() => { document.getElementById('sbar').style.width = pct + '%'; }, 100);
}

function showResults(answersArr) {
  form.questions.forEach((q, qi) => {
    const el = document.getElementById(`fq-${q.id}`);
    if (!el) return;
    if (!q.correctAnswers || !q.correctAnswers.length) return;

    const ans = answersArr.find(a => a.questionId === q.id);
    if (!ans) return;

    let isCorrect = false;
    if (q.type === 'single') {
      isCorrect = q.correctAnswers.includes(ans.value);
    } else if (q.type === 'multiple') {
      const userSet = new Set(Array.isArray(ans.value) ? ans.value : []);
      const corrSet = new Set(q.correctAnswers);
      isCorrect = userSet.size === corrSet.size && [...corrSet].every(c => userSet.has(c));
    } else {
      isCorrect = q.correctAnswers.some(a => a.toLowerCase() === String(ans.value).toLowerCase().trim());
    }

    el.classList.add(isCorrect ? 'is-correct' : 'is-wrong');

    if (!isCorrect && q.type === 'text') {
      const hint = document.createElement('div');
      hint.className = 'hint-box';
      hint.innerHTML = `✓ Правильна відповідь: <strong>${esc(q.correctAnswers[0])}</strong>`;
      el.appendChild(hint);
    }

    if (q.type === 'single' || q.type === 'multiple') {
      el.querySelectorAll('.choice').forEach(ch => {
        const opt = ch.getAttribute('data-opt');
        const userChose = q.type === 'single'
          ? ans.value === opt
          : (Array.isArray(ans.value) && ans.value.includes(opt));
        const correct = q.correctAnswers.includes(opt);
        ch.className = 'choice';
        if (userChose && correct) ch.classList.add('show-correct');
        else if (userChose && !correct) ch.classList.add('show-wrong');
        else if (!userChose && correct) ch.classList.add('reveal-correct');
      });
    }
  });
}

function esc(s) { return String(s || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c]); }

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = (type === 'ok' ? '✓ ' : '✕ ') + msg;
  document.getElementById('toast-root').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

loadForm();