const TREATMENTS_API = 'http://localhost:3000/api/treatments';

function normalizeDiseaseClass(value) {
  const v = String(value || '').toLowerCase();
  if (v.includes('blight')) return 'Leaf Blight';
  if (v.includes('spot')) return 'Leaf Spot';
  if (v.includes('healthy')) return 'Healthy';
  return 'Unknown';
}

function treatmentMatchesFilter(remedy, filter) {
  const f = String(filter || 'ALL').toLowerCase();
  if (f === 'all') return true;
  return remedy.detected_class === normalizeDiseaseClass(f);
}

function safeUrl(url) {
  return /^https?:\/\//i.test(url || '') ? url : null;
}

function remedyCardHtml(r) {
  const url = safeUrl(r.article_source_url);
  const sourceName = r.expert_reference_name || 'No source listed';
  const source = url
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-[#235940] font-semibold hover:underline">${escapeHtml(sourceName)}</a>`
    : `<span class="font-semibold text-slate-600">${escapeHtml(sourceName)}</span>`;

  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col space-y-3">
      <div class="flex items-start justify-between gap-3">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getBadgeClass(r.detected_class)}">${escapeHtml(r.detected_class)}</span>
        <button data-delete-id="${escapeHtml(r.id)}" title="Delete treatment"
                class="p-1.5 rounded-lg text-slate-400 hover:text-[#bc4749] hover:bg-rose-50 transition-colors">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
      <p class="text-sm font-medium text-slate-800 leading-relaxed">${escapeHtml(r.treatment_action)}</p>
      <div class="text-xs text-slate-500">Source: ${source}</div>
    </div>
  `;
}

/** Renders from state.remedies (already loaded). */
function renderRemedies() {
  const container = document.getElementById('remediesContainer');
  if (!container) return;

  const all = state.remedies;
  const filtered = all.filter((r) => treatmentMatchesFilter(r, state.currentTreatmentFilter));

  setCount('countAllRemedies', all.length);
  setCount('countSpotRemedies', all.filter((r) => r.detected_class === 'Leaf Spot').length);
  setCount('countBlightRemedies', all.filter((r) => r.detected_class === 'Leaf Blight').length);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 py-12 text-center text-slate-400 text-sm">
        Walay treatment protocols nga nakita sa database.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(remedyCardHtml).join('');
  refreshIcons();
}

function setCount(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

/** Fetches from the API, then renders. */
async function reloadRemedies() {
  const container = document.getElementById('remediesContainer');
  if (container) {
    container.innerHTML = `<div class="col-span-2 py-12 text-center text-slate-400 text-sm">Loading treatments...</div>`;
  }

  try {
    const response = await authFetch(TREATMENTS_API);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.remedies = Array.isArray(data) ? data : [];
    renderRemedies();
  } catch (error) {
    console.error('Error fetching treatments:', error);
    state.remedies = [];
    if (container) {
      container.innerHTML = `<div class="col-span-2 py-12 text-center text-red-500 text-sm">Error loading treatments. Make sure the Node server is running.</div>`;
    }
  }
}

async function deleteRemedy(remedyId) {
  const remedy = state.remedies.find((r) => String(r.id) === String(remedyId));
  if (!remedy) return;

  const warning = remedy.source_local_id != null
    ? '\n\nNote: this treatment came from the Android app, so it will be re-created on the next sync.'
    : '';
  if (!window.confirm(`Delete this treatment?${warning}`)) return;

  try {
    const response = await authFetch(`${TREATMENTS_API}/${encodeURIComponent(remedyId)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error((await response.json()).error || `HTTP ${response.status}`);
    showToast('Treatment deleted', 'Healthy');
    await reloadRemedies();
  } catch (error) {
    console.error('Error deleting treatment:', error);
    showToast(`Delete failed: ${error.message}`, 'Leaf Blight');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refreshIcons();
  reloadRemedies();

  document.getElementById('remediesContainer')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-id]');
    if (btn) deleteRemedy(btn.dataset.deleteId);
  });

  document.querySelectorAll('.treatment-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.treatment-filter-btn').forEach((b) => {
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
    remedyModal?.classList.remove('hidden');
  });

  const hideRemedyModal = () => remedyModal?.classList.add('hidden');
  closeRemedyModal?.addEventListener('click', hideRemedyModal);
  cancelRemedyBtn?.addEventListener('click', hideRemedyModal);

  remedyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const readValue = (...ids) => {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.value.trim()) return el.value.trim();
      }
      return '';
    };

    const diseaseClass = normalizeDiseaseClass(document.getElementById('remedyTargetDisease')?.value);
    const name         = readValue('remedyName');
    const guidelines   = readValue('remedyGuidelines');
    // Old form fields map to the real columns:
    //   name + guidelines -> treatment_action, active ingredient -> expert_reference_name
    // (Year has no column anymore.) If you add #remedyExpertRef / #remedyArticleUrl inputs, they take priority.
    const expertRef    = readValue('remedyExpertRef', 'remedyActiveIngredient');
    const articleUrl   = readValue('remedyArticleUrl');

    const treatmentAction = name && guidelines ? `${name}: ${guidelines}` : (guidelines || name);
    if (!treatmentAction) {
      showToast('Please enter a treatment name or guidelines.', 'Leaf Spot');
      return;
    }
    if (diseaseClass === 'Unknown') {
      showToast('Please choose a target disease.', 'Leaf Spot');
      return;
    }

    try {
      const response = await authFetch(TREATMENTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disease_class: diseaseClass,
          treatment_action: treatmentAction,
          expert_reference_name: expertRef || null,
          article_source_url: articleUrl || null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);

      hideRemedyModal();
      showToast(`Added new protocol: ${name || treatmentAction.slice(0, 40)}`, diseaseClass);
      await reloadRemedies();
    } catch (error) {
      console.error('Error adding treatment:', error);
      showToast(`Add failed: ${error.message}`, 'Leaf Blight');
    }
  });
});