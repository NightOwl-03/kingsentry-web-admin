let _parsedUser = null;
try {
  _parsedUser = JSON.parse(localStorage.getItem('kingsentry_current_user'));
} catch (e) {
  _parsedUser = null;   
}
const currentUserInfo = _parsedUser;

if (!window.location.pathname.includes('login.html')) {
  if (!currentUserInfo || currentUserInfo.role !== 'admin') {
    alert('Access Denied! For Administrators only.');
    window.location.href = 'login.html';
  }
} else if (currentUserInfo && currentUserInfo.role === 'admin') {
  window.location.href = 'dashboard.html';
}

const state = {
  currentTreatmentFilter: 'ALL',
  showBboxOverlay: true,
  highVeinContrast: false,
  hoverModeActive: true,                       
  activeInspectionScan: null,
  zones: ['Zone A (Slope)', 'Zone B (Riverbed)', 'Zone C (Ridge)', 'Zone D (Nursery)'],
  kpis: { total: 0, healthy: 0, leafSpot: 0, leafBlight: 0 },
  scans: [],
  remedies: []
};

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  } else {
    console.warn('Lucide not loaded yet — icons skipped.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!currentUserInfo) return;
  const displayName = currentUserInfo.username
    || currentUserInfo.name
    || (currentUserInfo.email ? currentUserInfo.email.split('@')[0] : 'Admin');
  const initials = displayName.substring(0, 2).toUpperCase();

  document.querySelectorAll('.text-xs.font-bold.text-slate-800.leading-tight')
    .forEach(el => { el.textContent = displayName; });
  document.querySelectorAll('.w-8.h-8.rounded-xl.bg-gradient-to-br')
    .forEach(el => { el.textContent = initials; });
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// fetch() that sends the admin's access token (if login.html stored one in kingsentry_current_user.access_token)
function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = currentUserInfo && currentUserInfo.access_token;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

function getBadgeClass(diseaseClass) {
  switch (diseaseClass) {
    case 'Healthy':
      return 'bg-emerald-100 text-[#1b4332] border border-emerald-300';
    case 'Leaf Spot':
      return 'bg-amber-100 text-amber-900 border border-amber-300';
    case 'Leaf Blight':
      return 'bg-rose-100 text-[#bc4749] border border-rose-300';
    case 'Unknown':
      return 'bg-slate-100 text-slate-600 border border-slate-300';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

function showToast(message, type = 'Healthy') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  let borderLeftColor = '#2d6a4f';
  let icon = 'check-circle';

  if (type === 'Leaf Blight') {
    borderLeftColor = '#bc4749';
    icon = 'alert-octagon';
  } else if (type === 'Leaf Spot') {
    borderLeftColor = '#d4a373';
    icon = 'alert-triangle';
  }

  toast.className = `pointer-events-auto flex items-center space-x-3 bg-white text-slate-800 text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-xl border border-slate-200 transition-all duration-300 transform translate-y-2 opacity-0`;
  toast.style.borderLeft = `5px solid ${borderLeftColor}`;
  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-5 h-5 shrink-0" style="color: ${borderLeftColor}"></i>
    <div class="font-medium text-slate-800">${message}</div>
  `;

  toastContainer.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 20);

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const closeSidebarMobileBtn = document.getElementById('closeSidebarMobileBtn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  mobileMenuBtn?.addEventListener('click', () => {
    sidebar?.classList.remove('-translate-x-full');
    sidebarBackdrop?.classList.remove('hidden');
  });
  const closeDrawer = () => {
    sidebar?.classList.add('-translate-x-full');
    sidebarBackdrop?.classList.add('hidden');
  };
  closeSidebarMobileBtn?.addEventListener('click', closeDrawer);
  sidebarBackdrop?.addEventListener('click', closeDrawer);

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('kingsentry_current_user');
    showToast("King's Sentry session logged out. Redirecting to login...", 'Healthy');
    setTimeout(() => { window.location.href = 'login.html'; }, 600);
  });
});