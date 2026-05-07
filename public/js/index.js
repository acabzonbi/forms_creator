async function loadForms() {
  const res = await API.get('/api/forms');
  const container = document.getElementById('forms-list');

  if (!res.success || res.data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size:40px;">📋</div>
        <p>У вас ще немає форм. Створіть першу!</p>
      </div>`;
    return;
  }

  container.innerHTML = res.data.map(form => `
    <div class="card" style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
      <div style="flex:1; min-width:0;">
        <div style="font-size:16px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${form.title}
        </div>
        <div style="font-size:13px; color:var(--text-muted); margin-top:2px;">
          ${form.fields.length} полів · ${new Date(form.createdAt).toLocaleDateString('uk')}
        </div>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <a href="/form/${form.id}" class="btn btn-outline btn-sm" target="_blank">Заповнити</a>
        <a href="/form/${form.id}/results" class="btn btn-outline btn-sm">Відповіді</a>
        <button class="btn btn-danger btn-sm" onclick="deleteForm('${form.id}')">Видалити</button>
      </div>
    </div>
  `).join('');
}

function openCreateModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'flex';
  document.getElementById('form-title').focus();
}

function closeCreateModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('form-title').value = '';
  document.getElementById('form-desc').value = '';
}

async function createForm() {
  const title = document.getElementById('form-title').value.trim();
  if (!title) { showToast('Введіть назву форми', 'error'); return; }

  const res = await API.post('/api/forms', {
    title,
    description: document.getElementById('form-desc').value.trim(),
    fields: [],
  });

  if (res.success) {
    closeCreateModal();
    showToast('Форму створено!');
    await loadForms();
  } else {
    showToast(res.error, 'error');
  }
}

async function deleteForm(id) {
  if (!confirm('Видалити форму?')) return;
  const res = await API.delete(`/api/forms/${id}`);
  if (res.success) { showToast('Форму видалено'); await loadForms(); }
  else showToast(res.error, 'error');
}

document.addEventListener('DOMContentLoaded', loadForms);
