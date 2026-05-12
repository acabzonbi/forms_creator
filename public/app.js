function esc(s) {
  return String(s || '').replace(/[<>&"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'
  })[c]);
}

function toast(msg, type = 'ok') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = (type === 'ok' ? '✓ ' : '✕ ') + msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
