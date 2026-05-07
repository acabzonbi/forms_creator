const FIELD_TYPES = { text: 'Текст', number: 'Число', select: 'Вибір', checkbox: 'Чекбокс' };

async function loadForm() {
  const formId = getFormId();
  const res = await API.get(`/api/forms/${formId}`);
  const container = document.getElementById('form-container');

  if (!res.success) {
    container.innerHTML = `<div class="empty-state"><p>Форму не знайдено</p></div>`;
    return;
  }

  const form = res.data;
  document.title = `${form.title} — FormFlow`;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${form.title}</h1>
      ${form.description ? `<p class="page-subtitle">${form.description}</p>` : ''}
    </div>
    <div id="fields-container">
      ${form.fields.map(field => renderField(field)).join('')}
    </div>
    ${form.fields.length === 0
      ? '<div class="empty-state"><p>Ця форма ще не має полів</p></div>'
      : `<button class="btn btn-primary" style="width:100%; margin-top:8px;" onclick="submitForm('${formId}')">Надіслати відповідь</button>`
    }
  `;
}

function renderField(field) {
  const required = field.required ? '<span style="color:var(--danger)"> *</span>' : '';
  let input = '';

  if (field.type === 'text') {
    input = `<input class="form-input" type="text" id="field-${field.id}" ${field.required ? 'required' : ''}>`;
  } else if (field.type === 'number') {
    input = `<input class="form-input" type="number" id="field-${field.id}" ${field.required ? 'required' : ''}>`;
  } else if (field.type === 'select' && field.options) {
    input = `<select class="form-input" id="field-${field.id}">
      <option value="">— Оберіть —</option>
      ${field.options.map(o => `<option value="${o}">${o}</option>`).join('')}
    </select>`;
  } else if (field.type === 'checkbox') {
    input = `<label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
      <input type="checkbox" id="field-${field.id}"> ${field.label}
    </label>`;
  }

  return `
    <div class="card">
      <label class="form-label" style="font-size:15px; color:var(--text);">${field.label}${required}</label>
      ${input}
    </div>`;
}

async function submitForm(formId) {
  const res = await API.get(`/api/forms/${formId}`);
  if (!res.success) return;

  const answers = {};
  for (const field of res.data.fields) {
    const el = document.getElementById(`field-${field.id}`);
    if (!el) continue;
    answers[field.id] = field.type === 'checkbox' ? el.checked : el.value;
  }

  const submitRes = await API.post(`/api/responses/${formId}`, { answers });
  if (submitRes.success) {
    document.getElementById('form-container').innerHTML = `
      <div class="empty-state" style="padding-top:80px;">
        <div style="font-size:48px;">✓</div>
        <p style="font-size:18px; font-weight:500; margin-top:16px;">Відповідь надіслано!</p>
        <p>Дякуємо за участь</p>
      </div>`;
  } else {
    showToast(submitRes.error, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadForm);
