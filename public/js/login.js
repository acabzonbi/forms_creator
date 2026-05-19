  const params = new URLSearchParams(location.search);
  const err = params.get('error');
  if (err) {
    const el = document.getElementById('err');
    el.style.display = 'block';
    el.textContent = err === 'cancelled'
      ? 'Вхід скасовано'
      : 'Помилка авторизації. Спробуйте ще раз.';
  }

  fetch('/auth/me')
    .then(r => r.json())
    .then(data => { if (data.loggedIn) location.href = '/'; });
    