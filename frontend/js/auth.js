const API = 'http://localhost:5000';

// Redirect unauthenticated users away from dashboard
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
  if (!localStorage.getItem('crm_token')) {
    window.location.href = 'login.html';
  }
}

async function doLogin() {
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value.trim();
  const errEl = document.getElementById('login-err');
  errEl.style.display = 'none';

  if (!username || !password) {
    errEl.textContent = 'Please enter username and password.';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('crm_token', data.token);
    localStorage.setItem('crm_user', data.username);
    window.location.href = 'index.html';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_user');
  window.location.href = 'login.html';
}

function authHeader() {
  return { 'Authorization': 'Bearer ' + localStorage.getItem('crm_token') };
}
