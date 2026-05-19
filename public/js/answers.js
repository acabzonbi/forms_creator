const id = new URLSearchParams(location.search).get('id');

async function load() {
  const [fRes, rRes] = await Promise.all([
    fetch(`/api/forms/${id}`),
    fetch(`/api/responses/${id}`)
  ]);
  const form = await fRes.json();
  const responses = await rRes.json();
  render(form, responses);
}

function render(form, responses) {
  const root = document.getElementById('root');
  const hasValidation = form.questions.some(q => q.correctAnswers && q.correctAnswers.length);

  if (!responses.length) {
    root.innerHTML = `
      <div class="accent-bar"></div>
      <h1 class="page-title">${esc(form.title)}</h1>
      <p class="page-sub">Відповіді на форму</p>
      <div class="empty-state">
        <div class="empty-title">Відповідей ще немає</div>
        <br>
        <a href="form.html?id=${id}" class="btn btn-primary">Пройти форму</a>
      </div>`;
    return;
  }

  const total = responses.length;
  let avgScore = null;
  if (hasValidation) {
    const withScore = responses.filter(r => r.score !== undefined && r.maxScore > 0);
    if (withScore.length) {
      avgScore = Math.round(withScore.reduce((s, r) => s + (r.score / r.maxScore * 100), 0) / withScore.length);
    }
  }

  root.innerHTML = `
    <div class="accent-bar"></div>
    <h1 class="page-title">${esc(form.title)}</h1>
    <p class="page-sub" style="margin-bottom:20px;">Відповіді на форму · ${total} відповід${pluralR(total)}</p>

    ${avgScore !== null ? `
      <div class="card" style="display:flex;align-items:center;gap:24px;padding:20px 24px;margin-bottom:24px;flex-wrap:wrap;">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:34px;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--accent-2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${avgScore}%</div>
          <div style="font-size:13px;color:var(--text-2);">Середній результат</div>
        </div>
        <div class="divider" style="width:1px;height:44px;margin:0;background:var(--border);"></div>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:34px;font-weight:800;color:var(--text);">${total}</div>
          <div style="font-size:13px;color:var(--text-2);">Всього відповідей</div>
        </div>
      </div>` : ''}

    <div class="section-hdr">
      <span class="section-lbl">Відповіді</span>
    </div>
    <div id="resp-list"></div>`;

  const list = document.getElementById('resp-list');

  responses.slice().reverse().forEach((resp, ri) => {
    const date = new Date(resp.createdAt).toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const scoreHtml = (resp.score !== undefined && resp.maxScore !== undefined)
      ? `<span class="badge ${scoreClass(resp.score, resp.maxScore)}" style="margin-left:8px;">
          ${resp.score}/${resp.maxScore} · ${Math.round(resp.score/resp.maxScore*100)}%
        </span>`
      : '';

    const card = document.createElement('div');
    card.className = 'resp-card';
    card.innerHTML = `
      <div class="resp-head" onclick="toggle(this)">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;">Відповідь #${total - ri}</span>
          <span style="color:var(--muted);font-size:12px;">${date}</span>
          ${scoreHtml}
        </div>
        <span style="color:var(--muted);font-size:12px;" id="arrow-${ri}">▼</span>
      </div>
      <div class="resp-body" id="body-${ri}">
        ${buildAnswerBody(form, resp)}
      </div>`;
    list.appendChild(card);
  });
}

function toggle(header) {
  const body = header.nextElementSibling;
  body.classList.toggle('open');
}

function buildAnswerBody(form, resp) {
  let html = '';
  form.questions.forEach((q, qi) => {
    const ans = Array.isArray(resp.answers)
      ? resp.answers.find(a => a.questionId === q.id)
      : null;

    const rawValue = ans ? ans.value : (Array.isArray(resp.answers) ? resp.answers[qi] : '?');
    const displayVal = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue || '—');

    let cls = '';
    if (q.correctAnswers && q.correctAnswers.length) {
      let correct = false;
      if (q.type === 'single') correct = q.correctAnswers.includes(rawValue);
      else if (q.type === 'multiple') {
        const us = new Set(Array.isArray(rawValue) ? rawValue : []);
        const cs = new Set(q.correctAnswers);
        correct = us.size === cs.size && [...cs].every(c => us.has(c));
      } else {
        correct = q.correctAnswers.some(a => a.toLowerCase() === String(rawValue).toLowerCase().trim());
      }
      cls = correct ? 'ok' : 'fail';
    }

    html += `
      <div class="ans-row">
        <div class="ans-q">${qi + 1}. ${esc(q.text)}</div>
        <div class="ans-v ${cls}">
          ${cls === 'ok' ? '✓ ' : cls === 'fail' ? '✕ ' : ''}${esc(displayVal)}
          ${cls === 'fail' && q.correctAnswers.length ? `<span style="font-size:12px;color:var(--muted);margin-left:8px;">(правильно: ${esc(q.correctAnswers.join(', '))})</span>` : ''}
        </div>
      </div>`;
  });
  return html || '<p style="color:var(--muted);font-size:13px;">Немає даних</p>';
}

function scoreClass(score, max) {
  if (!max) return 'badge-muted';
  const pct = score / max;
  if (pct >= 0.8) return 'badge-success';
  if (pct >= 0.5) return 'badge-warning';
  return 'badge-error';
}

function pluralR(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'ь';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'і';
  return 'ей';
}

function esc(s) { return String(s || '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]); }

load();