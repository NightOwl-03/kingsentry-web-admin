const USERS_API = 'http://localhost:3000/api/users';

state.users = [];

function userStatusBadge(status) {
  switch (status) {
    case 'Active':    return 'bg-emerald-100 text-[#1b4332] border border-emerald-300';
    case 'Pending':   return 'bg-amber-100 text-amber-900 border border-amber-300';
    case 'Suspended': return 'bg-rose-100 text-[#bc4749] border border-rose-300';
    default:          return 'bg-slate-100 text-slate-600 border border-slate-300';
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function pluralAccounts(n) {
  return `${n} ${n === 1 ? 'Account' : 'Accounts'}`;
}

function userRowHtml(u) {
  const name = u.username || u.email || 'Unnamed user';
  const initials = escapeHtml(name.substring(0, 2).toUpperCase());
  const roleLabel = String(u.role || 'farmer').toLowerCase().replace(/^./, (c) => c.toUpperCase());

  return `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="py-3 px-4">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">${initials}</div>
          <div>
            <div class="font-bold text-slate-900">${escapeHtml(name)}</div>
            <div class="text-[11px] text-slate-400">${escapeHtml(u.email || 'No email')}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">${escapeHtml(roleLabel)}</span>
      </td>
      <td class="py-3 px-4 text-xs text-slate-600">${u.zone ? escapeHtml(u.zone) : '<span class="text-slate-400">No orchard yet</span>'}</td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${userStatusBadge(u.status)}">${escapeHtml(u.status)}</span>
      </td>
      <td class="py-3 px-4 text-xs text-slate-600">${escapeHtml(formatDate(u.registered_at))}</td>
      <td class="py-3 px-4 text-right">
        <a href="photo-repository.html?user=${encodeURIComponent(u.id)}"
           class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#235940] text-xs font-bold transition-all border border-slate-200 no-underline">
          <i data-lucide="images" class="w-3.5 h-3.5"></i>
          <span>View scans (${Number(u.scans_count) || 0})</span>
        </a>
      </td>
    </tr>
  `;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderUsers() {
  const usersBody = document.getElementById('usersTableBody');
  if (!usersBody) return;

  const users = state.users;

  setText('farmerCount', pluralAccounts(users.length));
  setText('activeCount', pluralAccounts(users.filter((u) => u.status === 'Active').length));
  setText('scanTotalCount', `${users.reduce((sum, u) => sum + (Number(u.scans_count) || 0), 0)} Records`);

  if (users.length === 0) {
    usersBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-slate-400 text-sm">
          Walay users nga nakita sa database.
        </td>
      </tr>
    `;
    return;
  }

  usersBody.innerHTML = users.map(userRowHtml).join('');
  refreshIcons();
}

async function loadUsers() {
  const usersBody = document.getElementById('usersTableBody');
  if (usersBody) {
    usersBody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400 text-sm">Loading users...</td></tr>`;
  }

  try {
    const response = await authFetch(USERS_API);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    const data = await response.json();
    state.users = Array.isArray(data) ? data : [];
    renderUsers();
  } catch (error) {
    console.error('Error fetching users:', error);
    state.users = [];
    if (usersBody) {
      usersBody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-red-500 text-sm">Error loading users (${escapeHtml(error.message)}). Make sure the Node server is running.</td></tr>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refreshIcons();
  loadUsers();

  document.getElementById('refreshUsersBtn')?.addEventListener('click', async () => {
    await loadUsers();
    showToast('User list refreshed from database', 'Healthy');
  });
});