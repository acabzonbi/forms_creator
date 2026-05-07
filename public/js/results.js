let currentForm = null;

async function loadResults() {
  const formId = getFormId();
  const [formRes, respRes] = await Promise.all([
    API.get(`/api/forms/${formId}`),
    API.get(`/api/responses/${formId}`),
  ]);

  if (!formRes.success) {
    document.getElementById('form-title').textContent = 'Форму не знайдено';
    return;
  }

  currentForm = formRes.data;
  const responses = respRes.data || [];
  document.title = `${currentForm.title} — відповіді`;
  document.getElementById('form-title').textContent = currentForm.title;
  document.getElementById('responses-count').textContent = `${responses.length} відповідей`;
  document.getElementById('btn-share').href = `/form/${formId}`;

  const container = document.getElementById('responses-container');

  if (responses.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Поки немає відповідей</p></div>`;
    return;
  }

  container.innerHTML = responses.map((resp, i) => `
    <div class="card">
      <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
        <span style="font-weight:500;">Відповідь #${responses.length - i}</span>
        <span style="font-size:13px; color:var(--text-muted);">
          ${new Date(resp.submittedAt).toLocaleString('uk')}
        </span>
      </div>
      ${currentForm.fields.map(field => `
        <div style="margin-bottom:8px;">
          <span style="font-size:12px; color:var(--text-muted);">${field.label}</span><br>
          <span style="font-size:14px;">${resp.answers[field.id] ?? '—'}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

async function exportCSV() {
  if (!currentForm) return;
  const res = await API.get(`/api/responses/${getFormId()}`);
  if (!res.success || res.data.length === 0) { showToast('Немає даних для експорту', 'error'); return; }

  const headers = ['Дата', ...currentForm.fields.map(f => f.label)];
  const rows = res.data.map(r => [
    new Date(r.submittedAt).toLocaleString('uk'),
    ...currentForm.fields.map(f => r.answers[f.id] ?? ''),
  ]);

  const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${currentForm.title}-відповіді.csv`;
  a.click();
  showToast('CSV експортовано!');
}

document.addEventListener('DOMContentLoaded', loadResults);
