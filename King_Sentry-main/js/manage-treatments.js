
async function renderRemedies() {
  const container = document.getElementById('remediesContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-2 py-12 text-center text-slate-400 text-sm">
      Walay treatment protocols nga nakita sa database.
    </div>
  `;

  document.getElementById('countAllRemedies').textContent = "0";
  document.getElementById('countSpotRemedies').textContent = "0";
  document.getElementById('countBlightRemedies').textContent = "0";
}

function deleteRemedy(remedyId) {
  const idx = state.remedies.findIndex(r => r.id === remedyId);
  if (idx !== -1) {
    const deleted = state.remedies.splice(idx, 1)[0];
    renderRemedies();
    showToast(`Removed protocol: ${deleted.name}`, 'Healthy');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  renderRemedies();

  document.querySelectorAll('.treatment-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.treatment-filter-btn').forEach(b => {
        b.classList.remove('bg-[#1b4332]', 'text-white', 'shadow-sm');
        b.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
      });
      btn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
      btn.classList.add('bg-[#1b4332]', 'text-white', 'shadow-sm');

      state.currentTreatmentFilter = btn.getAttribute('data-filter');
      renderRemedies();
    });
  });

  const openAddRemedyBtn = document.getElementById('openAddRemedyBtn');
  const remedyModal      = document.getElementById('remedyModal');
  const closeRemedyModal = document.getElementById('closeRemedyModal');
  const cancelRemedyBtn  = document.getElementById('cancelRemedyBtn');
  const remedyForm       = document.getElementById('remedyForm');

  openAddRemedyBtn?.addEventListener('click', () => {
    remedyForm?.reset();
    const yearField = document.getElementById('remedyYear');
    if (yearField) yearField.value = "2026";
    remedyModal?.classList.remove('hidden');
  });

  const hideRemedyModal = () => remedyModal?.classList.add('hidden');
  closeRemedyModal?.addEventListener('click', hideRemedyModal);
  cancelRemedyBtn?.addEventListener('click', hideRemedyModal);

  remedyForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetDisease    = document.getElementById('remedyTargetDisease').value;
    const name             = document.getElementById('remedyName').value.trim();
    const activeIngredient = document.getElementById('remedyActiveIngredient').value.trim() || 'Active Fungicide Agent';
    const year             = parseInt(document.getElementById('remedyYear').value, 10) || 2026;
    const guidelines       = document.getElementById('remedyGuidelines').value.trim();

    const newRemedy = {
      id: `REM-${Date.now().toString().slice(-4)}`,
      targetDisease,
      name,
      activeIngredient,
      guidelines,
      year,
      category: targetDisease === 'Leaf Blight' ? 'Systemic Curative' : 'Protective Contact'
    };

    state.remedies.unshift(newRemedy);
    hideRemedyModal();
    renderRemedies();
    showToast(`Added new protocol: ${name}`, targetDisease);
  });
});
