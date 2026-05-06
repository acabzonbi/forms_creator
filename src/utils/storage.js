const fs = require('fs').promises;
const path = require('path');

const FORMS_DIR = path.join(__dirname, '../../data/forms');
const RESPONSES_DIR = path.join(__dirname, '../../data/responses');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}


async function readForm(id) {
  try {
    const raw = await fs.readFile(path.join(FORMS_DIR, `${id}.json`), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeForm(form) {
  await ensureDir(FORMS_DIR);
  await fs.writeFile(
    path.join(FORMS_DIR, `${form.id}.json`),
    JSON.stringify(form, null, 2),
    'utf-8'
  );
}

async function deleteForm(id) {
  await fs.unlink(path.join(FORMS_DIR, `${id}.json`));
}

async function listForms() {
  await ensureDir(FORMS_DIR);
  const files = await fs.readdir(FORMS_DIR);
  const forms = await Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(async f => {
        const raw = await fs.readFile(path.join(FORMS_DIR, f), 'utf-8');
        return JSON.parse(raw);
      })
  );
  return forms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}



async function writeResponse(response) {
  const dir = path.join(RESPONSES_DIR, response.formId);
  await ensureDir(dir);
  await fs.writeFile(
    path.join(dir, `${response.id}.json`),
    JSON.stringify(response, null, 2),
    'utf-8'
  );
}

async function listResponses(formId) {
  const dir = path.join(RESPONSES_DIR, formId);
  try {
    const files = await fs.readdir(dir);
    const responses = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          const raw = await fs.readFile(path.join(dir, f), 'utf-8');
          return JSON.parse(raw);
        })
    );
    return responses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  } catch {
    return [];
  }
}

module.exports = { readForm, writeForm, deleteForm, listForms, writeResponse, listResponses };
