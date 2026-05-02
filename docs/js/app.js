// ── STATE ──────────────────────────────────────────────────────────────────
let leads = [], activeLead = null, editMode = false;
let activeFilter = 'all', searchQ = '';

// ── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const user = localStorage.getItem('crm_user') || 'Admin';
  document.getElementById('sb-user').textContent = user;
  fetchLeads();

  document.getElementById('search').addEventListener('input', e => {
    searchQ = e.target.value;
    fetchLeads();
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fetchLeads();
    });
  });

  // Close overlays on bg click
  ['form-modal','detail-modal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target === e.currentTarget) document.getElementById(id).style.display = 'none';
    });
  });
});

// ── API HELPERS ────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(opts.headers || {}) }
  });
  if (res.status === 401) { logout(); return; }
  return res;
}

// ── FETCH & RENDER ─────────────────────────────────────────────────────────
async function fetchLeads() {
  const params = new URLSearchParams();
  if (activeFilter !== 'all') params.set('status', activeFilter);
  if (searchQ) params.set('search', searchQ);
  const res = await apiFetch(`/leads?${params}`);
  if (!res) return;
  leads = await res.json();
  render();
}

const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

function render() {
  const tbody = document.getElementById('lead-tbody');
  const empty = document.getElementById('empty-state');
  document.getElementById('lead-count').textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''} found`;

  // Stats (recalculate from full set each time)
  document.getElementById('st-total').textContent    = leads.length;
  document.getElementById('st-new').textContent      = leads.filter(l => l.status === 'new').length;
  document.getElementById('st-contacted').textContent = leads.filter(l => l.status === 'contacted').length;
  document.getElementById('st-closed').textContent   = leads.filter(l => l.status === 'closed').length;

  if (!leads.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  tbody.innerHTML = leads.map(l => `
    <tr onclick="openDetail('${l._id}')">
      <td><span class="lead-id">${esc(l.leadId)}</span></td>
      <td><div class="lead-name">${esc(l.name)}</div><div class="lead-email">${esc(l.email)}</div></td>
      <td>${esc(l.phone)}</td>
      <td><div class="msg-preview">${esc(l.message) || '—'}</div></td>
      <td><span class="date-cell">${fmtDate(l.createdAt)}</span></td>
      <td><span class="badge ${l.status}">${l.status}</span></td>
      <td onclick="event.stopPropagation()">
        <button class="action-btn" onclick="openEditFromTable('${l._id}')" title="Edit">✏️</button>
      </td>
    </tr>
  `).join('');
}

// ── FORM MODAL ─────────────────────────────────────────────────────────────
function openAddModal() {
  editMode = false; activeLead = null;
  document.getElementById('form-modal-title').textContent = 'Add New Lead';
  ['name','email','phone','message'].forEach(f => document.getElementById('f-'+f).value = '');
  document.getElementById('f-status').value = 'new';
  document.getElementById('form-err').style.display = 'none';
  ['name','email','phone'].forEach(f => document.getElementById('err-'+f).textContent = '');
  document.getElementById('form-modal').style.display = 'flex';
}

function openEditModal() {
  if (!activeLead) return;
  closeDetailModal();
  editMode = true;
  document.getElementById('form-modal-title').textContent = 'Edit Lead';
  document.getElementById('f-name').value    = activeLead.name;
  document.getElementById('f-email').value   = activeLead.email;
  document.getElementById('f-phone').value   = activeLead.phone;
  document.getElementById('f-message').value = activeLead.message || '';
  document.getElementById('f-status').value  = activeLead.status;
  document.getElementById('form-err').style.display = 'none';
  document.getElementById('form-modal').style.display = 'flex';
}

function openEditFromTable(id) {
  activeLead = leads.find(l => l._id === id);
  openEditModal();
}

function closeFormModal() { document.getElementById('form-modal').style.display = 'none'; }

function validateForm(name, email, phone) {
  let ok = true;
  ['name','email','phone'].forEach(f => document.getElementById('err-'+f).textContent = '');
  if (!name) { document.getElementById('err-name').textContent = 'Name is required.'; ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { document.getElementById('err-email').textContent = 'Invalid email.'; ok = false; }
  if (!/^[\d\s\+\-\(\)]{7,15}$/.test(phone)) { document.getElementById('err-phone').textContent = 'Invalid phone.'; ok = false; }
  return ok;
}

async function saveLead() {
  const name    = document.getElementById('f-name').value.trim();
  const email   = document.getElementById('f-email').value.trim();
  const phone   = document.getElementById('f-phone').value.trim();
  const message = document.getElementById('f-message').value.trim();
  const status  = document.getElementById('f-status').value;
  if (!validateForm(name, email, phone)) return;

  const body = JSON.stringify({ name, email, phone, message, status });
  let res;
  if (editMode && activeLead) {
    res = await apiFetch(`/leads/${activeLead._id}`, { method: 'PUT', body });
  } else {
    res = await apiFetch('/leads', { method: 'POST', body });
  }
  if (!res) return;
  if (!res.ok) {
    const d = await res.json();
    document.getElementById('form-err').textContent = d.error;
    document.getElementById('form-err').style.display = 'block';
    return;
  }
  closeFormModal();
  fetchLeads();
}

// ── DETAIL MODAL ───────────────────────────────────────────────────────────
function openDetail(id) {
  activeLead = leads.find(l => l._id === id);
  if (!activeLead) return;
  document.getElementById('d-name').textContent    = activeLead.name;
  document.getElementById('d-leadid').textContent  = activeLead.leadId;
  document.getElementById('d-email').textContent   = activeLead.email;
  document.getElementById('d-phone').textContent   = activeLead.phone;
  document.getElementById('d-date').textContent    = fmtDate(activeLead.createdAt);
  document.getElementById('d-message').textContent = activeLead.message || '—';
  document.getElementById('d-status-sel').value    = activeLead.status;
  document.getElementById('note-input').value = '';
  renderNotes();
  document.getElementById('detail-modal').style.display = 'flex';
}

function closeDetailModal() { document.getElementById('detail-modal').style.display = 'none'; }

function renderNotes() {
  const el = document.getElementById('d-notes-list');
  if (!activeLead?.notes?.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:.83rem;margin-bottom:6px">No notes yet.</div>';
    return;
  }
  el.innerHTML = activeLead.notes.map(n => `
    <div class="note-item">
      ${esc(n.text)}
      <div class="note-date">${fmtDate(n.createdAt)}</div>
      <button class="del-note" onclick="deleteNote('${n._id}')">✕</button>
    </div>
  `).join('');
}

async function addNote() {
  const inp = document.getElementById('note-input');
  const txt = inp.value.trim();
  if (!txt || !activeLead) return;
  const res = await apiFetch(`/leads/${activeLead._id}`, {
    method: 'PUT',
    body: JSON.stringify({ addNote: txt })
  });
  if (!res || !res.ok) return;
  activeLead = await res.json();
  // Sync back into leads array
  leads = leads.map(l => l._id === activeLead._id ? activeLead : l);
  inp.value = '';
  renderNotes();
}

async function deleteNote(noteId) {
  const res = await apiFetch(`/leads/${activeLead._id}`, {
    method: 'PUT',
    body: JSON.stringify({ deleteNoteId: noteId })
  });
  if (!res || !res.ok) return;
  activeLead = await res.json();
  leads = leads.map(l => l._id === activeLead._id ? activeLead : l);
  renderNotes();
}

async function updateStatus() {
  const status = document.getElementById('d-status-sel').value;
  const res = await apiFetch(`/leads/${activeLead._id}`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
  if (!res || !res.ok) return;
  activeLead = await res.json();
  leads = leads.map(l => l._id === activeLead._id ? activeLead : l);
  render();
}

async function deleteLead() {
  if (!activeLead || !confirm('Delete this lead? This cannot be undone.')) return;
  const res = await apiFetch(`/leads/${activeLead._id}`, { method: 'DELETE' });
  if (!res || !res.ok) return;
  closeDetailModal();
  fetchLeads();
}
