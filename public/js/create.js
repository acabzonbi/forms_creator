let questions = [];
let counter = 0;

function addQuestion(type) {
  const id = ++counter;
  const q = { id, type, text: '', options: [], correctAnswers: [] };
  if (type === 'single' || type === 'multiple') {
    q.options = ['', ''];
  }
  questions.push(q);
  renderAll();
  setTimeout(() => {
    const el = document.getElementById(`qt-${id}`);
    if (el) el.focus();
  }, 100);
}

function removeQuestion(id) {
  questions = questions.filter(q => q.id !== id);
  renderAll();
}

function addOption(qId) {
  const q = questions.find(x => x.id === qId);
  q.options.push('');
  renderAll();
  setTimeout(() => {
    const opts = document.querySelectorAll(`[data-opt-for="${qId}"]`);
    if (opts.length) opts[opts.length - 1].focus();
  }, 80);
}

function removeOption(qId, idx) {
  const q = questions.find(x => x.id === qId);
  q.options.splice(idx, 1);
  q.correctAnswers = q.correctAnswers.filter(a => q.options.includes(a));
  renderAll();
}

function toggleCorrect(qId, value) {
  const q = questions.find(x => x.id === qId);
  if (q.type === 'single') {
    q.correctAnswers = q.correctAnswers.includes(value) ? [] : [value];
  } else {
    if (q.correctAnswers.includes(value)) {
      q.correctAnswers = q.correctAnswers.filter(a => a !== value);
    } else {
      q.correctAnswers.push(value);
    }
  }
  renderAll();
}

function syncField(qId, field, value) {
  const q = questions.find(x => x.id === qId);
  q[field] = value;
}

function syncOption(qId, idx, value) {
  const q = questions.find(x => x.id === qId);
  const old = q.options[idx];
  const ci = q.correctAnswers.indexOf(old);
  q.options[idx] = value;
  if (ci !== -1) q.correctAnswers[ci] = value;
}

function renderAll() {
  const list = document.getElementById('question-list');
  const empty = document.getElementById('empty-q');
  empty.style.display = questions.length ? 'none' : 'block';

  const focused = document.activeElement;
  const focusedId = focused ? focused.id : null;
  const focusedSel = focused ? focused.getAttribute('data-sel') : null;

  list.innerHTML = '';
  questions.forEach((q, qi) => {
    const typeLabel = q.type === 'single' ? 'Одна відповідь' : q.type === 'multiple' ? 'Декілька відповідей' : 'Текст';
    const chipClass = `chip-${q.type}`;

    let bodyHtml = `
      <div class="form-group" style="margin-bottom:12px;">
        <input class="input" id="qt-${q.id}" value="${esc(q.text)}"
          placeholder="Введіть запитання..."
          oninput="syncField(${q.id},'text',this.value)">
      </div>`;

    if (q.type === 'single' || q.type === 'multiple') {
      bodyHtml += `<div class="section-lbl" style="margin-bottom:8px;">Варіанти відповідей <span style="color:var(--success);font-size:10px;">(✓ = правильна)</span></div>`;
      bodyHtml += `<div class="options-list">`;
      q.options.forEach((opt, oi) => {
        const isCorrect = q.correctAnswers.includes(opt) && opt !== '';
        const shapeClass = q.type === 'multiple' ? 'multi-shape' : '';
        bodyHtml += `
          <div class="option-row">
            <button class="correct-toggle ${shapeClass} ${isCorrect ? 'on' : ''}"
              onclick="toggleCorrect(${q.id}, document.querySelector('[data-opt-for=\\'${q.id}\\'][data-opt-idx=\\'${oi}\\']').value)"
              title="Позначити як правильну">✓</button>
            <input class="input" data-opt-for="${q.id}" data-opt-idx="${oi}"
              value="${esc(opt)}" placeholder="Варіант ${oi + 1}"
              oninput="syncOption(${q.id},${oi},this.value);syncToggleColor(this)"
              id="opt-${q.id}-${oi}">
            ${q.options.length > 2 ? `<button class="btn btn-icon btn-danger btn-sm" onclick="removeOption(${q.id},${oi})" style="flex-shrink:0;">✕</button>` : ''}
          </div>`;
      });
      bodyHtml += `</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="addOption(${q.id})">+ Додати варіант</button>`;

      if (q.correctAnswers.length > 0) {
        bodyHtml += `<div class="hint-box" style="margin-top:12px;">✓ Правильна відповідь: <strong>${q.correctAnswers.map(esc).join(', ')}</strong></div>`;
      }

    } else {
      bodyHtml += `
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Правильна відповідь (необов'язково, для валідації)</label>
          <input class="input" id="correct-${q.id}" value="${esc(q.correctAnswers[0] || '')}"
            placeholder="Залиште порожнім, якщо не потрібна валідація"
            oninput="questions.find(x=>x.id===${q.id}).correctAnswers=this.value?[this.value]:[]">
        </div>`;
    }

    const item = document.createElement('div');
    item.className = 'q-item';
    item.innerHTML = `
      <div class="q-header">
        <div class="q-num">${qi + 1}</div>
        <span class="q-type-chip ${chipClass}">${typeLabel}</span>
        <button class="q-remove" onclick="removeQuestion(${q.id})" title="Видалити">✕</button>
      </div>
      <div class="q-body">${bodyHtml}</div>`;
    list.appendChild(item);
  });

  if (focusedId) {
    const el = document.getElementById(focusedId);
    if (el) { el.focus(); const len = el.value.length; try { el.setSelectionRange(len, len); } catch(e) {} }
  }
}

function syncToggleColor(input) {
}

function esc(s) { return String(s || '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]); }

async function save() {
  const title = document.getElementById('title').value.trim();
  if (!title) { toast('Введіть назву форми', 'err'); return; }
  if (questions.length === 0) { toast('Додайте хоча б одне запитання', 'err'); return; }

  for (const q of questions) {
    if (!q.text.trim()) { toast('Заповніть усі запитання', 'err'); return; }
    if (q.type !== 'text') {
      const nonEmpty = q.options.filter(o => o.trim());
      if (nonEmpty.length < 2) { toast('Кожне запитання з варіантами має мати мінімум 2 варіанти', 'err'); return; }
    }
  }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Збереження...';

  const finalQuestions = questions.map(q => ({
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random(),
    text: q.text.trim(),
    type: q.type,
    options: q.type !== 'text' ? q.options.filter(o => o.trim()) : [],
    correctAnswers: q.correctAnswers.filter(a => a.trim())
  }));

  const description = document.getElementById('description').value.trim();

  const res = await fetch('/api/forms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, questions: finalQuestions })
  });

  if (res.ok) {
    location.href = '/';
  } else {
    toast('Помилка збереження', 'err');
    btn.disabled = false;
    btn.textContent = 'Зберегти форму';
  }
}

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = (type === 'ok' ? '✓ ' : '✕ ') + msg;
  document.getElementById('toast-root').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

addQuestion('single');