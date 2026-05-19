async function load() {
  const res = await fetch('/api/forms');
  const forms = await res.json();
  const root = document.getElementById('root');

  if (!forms.length) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">Немає форм</div>
        <br>
        <a href="create.html" class="btn btn-primary">+ Створити форму</a>
      </div>`;
    return;
  }

  root.innerHTML = `<div class="section-hdr">
    <span class="section-lbl">${forms.length} форм${plural(forms.length)}</span>
  </div><div class="forms-grid" id="grid"></div>`;

  const grid = document.getElementById('grid');
  forms.forEach(f => {
    const qCount = f.questions ? f.questions.length : 0;
    const hasValidation = f.questions && f.questions.some(q =>
      q.correctAnswers && q.correctAnswers.length > 0
    );
    const div = document.createElement('div');
    div.className = 'card card-interactive form-card';
    div.innerHTML = `
      <div class="form-card-info">
        <div class="form-card-title">${esc(f.title)}</div>
        <div class="form-card-meta">
          <span class="badge badge-accent"> ${qCount} запит${pluralQ(qCount)}</span>
          ${hasValidation ? '<span class="badge badge-success"> Валідація</span>' : ''}
        </div>
      </div>
      <div class="form-card-actions">
        <a href="form.html?id=${f.id}" class="btn btn-sm btn-secondary">Пройти</a>
        <a href="answers.html?id=${f.id}" class="btn btn-sm btn-ghost">Відповіді</a>
        <button class="btn btn-sm btn-icon btn-danger" onclick="confirmDelete('${f.id}','${esc(f.title)}')" title="Видалити">✕</button>
      </div>`;
    grid.appendChild(div);
  });
}

fetch('/auth/me')
  .then(r => r.json())
  .then(data => {
    if (!data.loggedIn) {
      location.href = '/login.html';
      return;
    }
    // Підставляємо аватар і ім'я
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('user-avatar').src = data.user.picture;
    document.getElementById('user-name').textContent = data.user.name;
});

function plural(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'а';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'и';
  return '';
}
function pluralQ(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'ання';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'ань';
  return 'ань';
}
function esc(s) { return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]); }

function confirmDelete(id, title) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.innerHTML = `
    <div class="modal">
      <div class="modal-title">Видалити форму?</div>
      <div class="modal-text">«${esc(title)}» буде видалено назавжди разом з усіма відповідями.</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancel-del">Скасувати</button>
        <button class="btn btn-danger" id="confirm-del">Видалити</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('cancel-del').onclick = () => ov.remove();
  document.getElementById('confirm-del').onclick = async () => {
    ov.remove();
    await fetch(`/api/forms/${id}`, { method: 'DELETE' });
    toast('Форму видалено', 'ok');
    load();
  };
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('toast-root').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

load();