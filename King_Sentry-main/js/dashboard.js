
let doughnutChartInstance = null;
let zoneChartInstance = null;

const API_BASE = 'http://localhost:3000/api/dashboard';

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function setWidth(id, value) {
  const el = document.getElementById(id);
  if (el) el.style.width = value;
}

function initCharts() {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js failed to load — charts skipped.');
    return;
  }

  const doughnutEl = document.getElementById('diseaseDoughnutChart');
  if (doughnutEl) {
    doughnutChartInstance = new Chart(doughnutEl.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Healthy', 'Leaf Spot', 'Leaf Blight'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#2d6a4f', '#d4a373', '#bc4749'],
          borderWidth: 4,
          borderColor: '#ffffff',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '76%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${context.raw} scans`
            }
          }
        }
      }
    });
  }

  const zoneEl = document.getElementById('zoneBarLineChart');
  if (zoneEl) {
    zoneChartInstance = new Chart(zoneEl.getContext('2d'), {
      type: 'bar',
      data: {
        labels: state.zones,
        datasets: [
          { label: 'Healthy',     data: [0, 0, 0, 0], backgroundColor: '#2d6a4f', borderRadius: 8 },
          { label: 'Leaf Spot',   data: [0, 0, 0, 0], backgroundColor: '#d4a373', borderRadius: 8 },
          { label: 'Leaf Blight', data: [0, 0, 0, 0], backgroundColor: '#bc4749', borderRadius: 8 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 12, family: 'Inter' } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11, family: 'Inter' } } }
        }
      }
    });
  }

  window.doughnutChartInstance = doughnutChartInstance;
  window.zoneChartInstance = zoneChartInstance;
}

function renderKPIs(kpis) {
  const total   = Number(kpis.total)      || 0;
  const healthy = Number(kpis.healthy)    || 0;
  const spot    = Number(kpis.leafSpot)   || 0;
  const blight  = Number(kpis.leafBlight) || 0;

  state.kpis = { total, healthy, leafSpot: spot, leafBlight: blight };

  setText('kpiTotalScans', total.toLocaleString());
  setText('kpiHealthy',    healthy.toLocaleString());
  setText('kpiLeafSpot',   spot.toLocaleString());
  setText('kpiLeafBlight', blight.toLocaleString());

  const pct = (n) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0');
  const hp = pct(healthy), sp = pct(spot), bp = pct(blight);

  setText('kpiHealthyPct',    `${hp}%`);
  setText('kpiLeafSpotPct',   `${sp}%`);
  setText('kpiLeafBlightPct', `${bp}%`);
  setWidth('kpiHealthyBar',    `${hp}%`);
  setWidth('kpiLeafSpotBar',   `${sp}%`);
  setWidth('kpiLeafBlightBar', `${bp}%`);
  setText('legendHealthy', `${hp}%`);
  setText('legendSpot',    `${sp}%`);
  setText('legendBlight',  `${bp}%`);
  setText('centerHealthPct', `${Math.round(parseFloat(hp))}%`);

  if (doughnutChartInstance) {
    doughnutChartInstance.data.datasets[0].data = [healthy, spot, blight];
    doughnutChartInstance.update();
  }
}

async function updateKPIsAndCharts() {
  try {
    const response = await fetch(`${API_BASE}/kpis`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderKPIs(await response.json());
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    renderKPIs({});            
  }
}

async function renderRecentScansFeed() {
  const recentBody = document.getElementById('dashboardRecentScansBody');
  if (!recentBody) return;

  try {
    const response = await fetch(`${API_BASE}/scans`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const realScans = await response.json();

    state.scans = Array.isArray(realScans) ? realScans : [];
    recentBody.innerHTML = '';

    if (state.scans.length === 0) {
      recentBody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-slate-400">No scan data found yet.</td></tr>`;
      return;
    }

    state.scans.slice(0, 5).forEach(scan => {
      const detectedClass = scan.disease_dictionary ? scan.disease_dictionary.disease_name : 'Healthy';
      const confidence = (Number(scan.confidence_score) || 0) * 100;
      const badgeClass = getBadgeClass(detectedClass);
      const barColor = detectedClass === 'Healthy' ? 'bg-[#2d6a4f]'
                     : detectedClass === 'Leaf Spot' ? 'bg-[#d4a373]' : 'bg-[#bc4749]';

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition-colors';
      tr.innerHTML = `
        <td class="py-3 px-4 font-mono font-bold text-slate-800">${String(scan.id).substring(0, 8)}...</td>
        <td class="py-3 px-4"><span class="font-bold text-slate-900">Sinoron Orchard</span></td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}">${detectedClass}</span>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center space-x-1.5">
            <div class="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div class="h-full ${barColor}" style="width: ${confidence}%"></div>
            </div>
            <span class="font-mono text-xs font-bold text-slate-700">${confidence.toFixed(1)}%</span>
          </div>
        </td>
        <td class="py-3 px-4 text-xs text-slate-500">${new Date(scan.scan_timestamp).toLocaleDateString()}</td>
        <td class="py-3 px-4 text-right">
          <button data-inspect-id="${scan.id}" class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#235940] text-xs font-bold transition-all border border-slate-200">
            <i data-lucide="scan" class="w-3.5 h-3.5"></i>
            <span>Inspect</span>
          </button>
        </td>
      `;
      recentBody.appendChild(tr);
    });

    refreshIcons();   
  } catch (error) {
    console.error('Error fetching scans from database:', error);
    recentBody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-red-500">Error loading data. Make sure the Node server is running.</td></tr>`;
  }
}

async function refreshDashboard() {
  await Promise.all([updateKPIsAndCharts(), renderRecentScansFeed()]);
  showToast('Dashboard refreshed from database', 'Healthy');
}

function togglePanel(panelId, forceState) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const isCurrentlyExpanded = panel.classList.contains('is-expanded');
  const shouldExpand = forceState !== undefined ? forceState : !isCurrentlyExpanded;

  if (shouldExpand) {
    panel.classList.remove('is-collapsed');
    panel.classList.add('is-expanded');
  } else {
    panel.classList.remove('is-expanded');
    panel.classList.add('is-collapsed');
  }

  if (shouldExpand) {
    if (panelId === 'panel-diagnostics' && window.doughnutChartInstance) window.doughnutChartInstance.resize();
    if (panelId === 'panel-zonal' && window.zoneChartInstance) window.zoneChartInstance.resize();
  }
}
window.togglePanel = togglePanel; 

function normalizeScan(raw) {
  const detectedClass = raw.disease_dictionary ? raw.disease_dictionary.disease_name : 'Healthy';
  const confidence = Number(((Number(raw.confidence_score) || 0) * 100).toFixed(1));
  const bbox = raw.bbox || { x: 80, y: 70, w: 390, h: 240 };
  return {
    id: raw.id,
    zone: raw.zone || 'Sinoron Orchard',
    treeId: raw.tree_id || 'N/A',
    detectedClass,
    confidence,
    latency: raw.latency || 'N/A',
    bbox,
    notes: raw.notes || 'No agronomic notes recorded for this scan.'
  };
}

function inspectScan(scanId) {
  const raw = state.scans.find(s => String(s.id) === String(scanId));
  if (!raw) return;
  const scan = normalizeScan(raw);

  state.activeInspectionScan = scan;

  setText('modalScanIdTitle', `YOLO26 Inspector: ${String(scan.id).substring(0, 8)}...`);
  setText('modalSubTitle', `${scan.zone} • ${scan.treeId} • Latency ${scan.latency}`);

  const badge = document.getElementById('modalDiagnosisBadge');
  if (badge) {
    badge.textContent = `${scan.detectedClass} (${scan.confidence}%)`;
    badge.className = `inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold mb-3 ${getBadgeClass(scan.detectedClass)}`;
  }

  setText('modalConfidence', `${scan.confidence}%`);
  setText('modalZone', scan.zone);
  setText('modalCoords', `[x:${scan.bbox.x}, y:${scan.bbox.y}, w:${scan.bbox.w}, h:${scan.bbox.h}]`);
  setText('modalLatency', scan.latency);
  setText('modalRemedyRecommendation', scan.notes);

  drawLeafInspectionCanvas(scan);
  document.getElementById('bboxModal')?.classList.remove('hidden');
}

function drawLeafInspectionCanvas(scan) {
  const canvas = document.getElementById('bboxCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#10251c');
  bgGrad.addColorStop(1, '#07120d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(66, 184, 131, 0.08)';
  ctx.beginPath(); ctx.arc(90, 80, 75, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(470, 300, 95, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  const leafCenterY = h / 2;

  ctx.beginPath();
  ctx.moveTo(80, leafCenterY);
  ctx.bezierCurveTo(180, 60, 380, 60, 490, leafCenterY);
  ctx.bezierCurveTo(380, h - 60, 180, h - 60, 80, leafCenterY);
  ctx.closePath();

  const leafGrad = ctx.createLinearGradient(80, 100, 480, 300);
  if (state.highVeinContrast) {
    leafGrad.addColorStop(0, '#0e3020');
    leafGrad.addColorStop(0.5, '#194932');
    leafGrad.addColorStop(1, '#0a2116');
  } else {
    leafGrad.addColorStop(0, '#235940');
    leafGrad.addColorStop(0.4, '#38845e');
    leafGrad.addColorStop(0.8, '#1b4332');
    leafGrad.addColorStop(1, '#112b20');
  }
  ctx.fillStyle = leafGrad;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(66, 184, 131, 0.4)';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(75, leafCenterY);
  ctx.quadraticCurveTo(280, leafCenterY - 2, 490, leafCenterY);
  ctx.lineWidth = state.highVeinContrast ? 4 : 3;
  ctx.strokeStyle = state.highVeinContrast ? '#a7f3d0' : '#74c69d';
  ctx.stroke();

  const veinColor = state.highVeinContrast ? 'rgba(167, 243, 208, 0.45)' : 'rgba(116, 198, 157, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = veinColor;
  for (let x = 120; x <= 450; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, leafCenterY);
    ctx.quadraticCurveTo(x + 25, leafCenterY - 45, x + 40, leafCenterY - (Math.sin((x / 500) * Math.PI) * 90));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, leafCenterY);
    ctx.quadraticCurveTo(x + 25, leafCenterY + 45, x + 40, leafCenterY + (Math.sin((x / 500) * Math.PI) * 90));
    ctx.stroke();
  }

  if (scan.detectedClass === 'Leaf Spot') {
    const bx = scan.bbox.x + scan.bbox.w / 2;
    const by = scan.bbox.y + scan.bbox.h / 2;
    const spotGrad = ctx.createRadialGradient(bx, by, 4, bx, by, 35);
    spotGrad.addColorStop(0, '#593e25');
    spotGrad.addColorStop(0.4, '#a77648');
    spotGrad.addColorStop(0.7, '#d4a373');
    spotGrad.addColorStop(1, 'rgba(212, 163, 115, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath(); ctx.arc(bx, by, 36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(89, 62, 37, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(bx, by, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx + 26, by - 22, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#b07d4b'; ctx.fill();
  } else if (scan.detectedClass === 'Leaf Blight') {
    const bx = scan.bbox.x + scan.bbox.w / 2;
    const by = scan.bbox.y + scan.bbox.h / 2;
    const blightGrad = ctx.createRadialGradient(bx, by, 10, bx, by, 65);
    blightGrad.addColorStop(0, '#3a0c0e');
    blightGrad.addColorStop(0.3, '#781d22');
    blightGrad.addColorStop(0.6, '#bc4749');
    blightGrad.addColorStop(0.85, '#e07a5f');
    blightGrad.addColorStop(1, 'rgba(188, 71, 73, 0)');
    ctx.fillStyle = blightGrad;
    ctx.beginPath();
    ctx.moveTo(bx - 40, by - 25);
    ctx.bezierCurveTo(bx - 20, by - 60, bx + 50, by - 40, bx + 45, by + 10);
    ctx.bezierCurveTo(bx + 40, by + 50, bx - 10, by + 55, bx - 45, by + 30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30, 8, 9, 0.85)';
    ctx.beginPath(); ctx.arc(bx, by, 18, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();

  if (state.showBboxOverlay) {
    const { x, y, w: bw, h: bh } = scan.bbox;
    const color = scan.detectedClass === 'Healthy' ? '#42b883' : scan.detectedClass === 'Leaf Spot' ? '#d4a373' : '#bc4749';
    const labelText = `${scan.detectedClass} ${scan.confidence.toFixed(1)}%`;

    ctx.fillStyle = scan.detectedClass === 'Healthy'
      ? 'rgba(66, 184, 131, 0.12)'
      : scan.detectedClass === 'Leaf Spot'
      ? 'rgba(212, 163, 115, 0.18)'
      : 'rgba(188, 71, 73, 0.22)';
    ctx.fillRect(x, y, bw, bh);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, bw, bh);

    const cornerLen = 14;
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + bw - cornerLen, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + cornerLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + bh - cornerLen); ctx.lineTo(x, y + bh); ctx.lineTo(x + cornerLen, y + bh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + bw - cornerLen, y + bh); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw, y + bh - cornerLen); ctx.stroke();

    ctx.font = 'bold 11px Inter, sans-serif';
    const textMetrics = ctx.measureText(labelText);
    const tagWidth = textMetrics.width + 16;
    const tagHeight = 22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y - tagHeight - 2, tagWidth, tagHeight, [4, 4, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, x + 8, y - 7);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    const cx = x + bw / 2;
    const cy = y + bh / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
    ctx.stroke();
  }
}

function safely(label, fn) {
  try { fn(); } catch (e) { console.error(`[dashboard] ${label} failed:`, e); }
}

document.addEventListener('DOMContentLoaded', () => {
  safely('icons', refreshIcons);

  safely('hover mode', () => {
    document.body.classList.add('hover-expand-enabled');   
    const btn = document.getElementById('toggleHoverModeBtn');
    const status = document.getElementById('hoverModeStatus');
    btn?.addEventListener('click', () => {
      state.hoverModeActive = !state.hoverModeActive;
      document.body.classList.toggle('hover-expand-enabled', state.hoverModeActive);
      if (status) {
        status.textContent = state.hoverModeActive ? 'ON' : 'OFF';
        status.className = state.hoverModeActive ? 'font-bold text-[#42b883]' : 'font-bold text-slate-400';
      }
      showToast(state.hoverModeActive
        ? 'Hover-to-Show Mode Enabled: Hover over panels to expand'
        : 'Hover-to-Show Mode Disabled: Click panels to open/close', 'Healthy');
    });
  });

  const allPanelIds = ['panel-kpi', 'panel-diagnostics', 'panel-zonal', 'panel-livefeed'];

  safely('expand/collapse all', () => {
    document.getElementById('btnExpandAllDashboards')?.addEventListener('click', () => {
      allPanelIds.forEach(id => togglePanel(id, true));
      showToast('All dashboard panels expanded', 'Healthy');
    });
    document.getElementById('btnCollapseAllDashboards')?.addEventListener('click', () => {
      allPanelIds.forEach(id => togglePanel(id, false));
      showToast('All dashboard panels collapsed (Hover over any panel to preview)', 'Healthy');
    });
  });

  safely('isolation pills', () => {
    document.querySelectorAll('.dash-isolate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dash-isolate-btn').forEach(b => {
          b.classList.remove('active', 'bg-white', 'text-emerald-950', 'shadow-sm', 'font-bold');
          b.classList.add('text-slate-600', 'font-medium');
        });
        btn.classList.add('active', 'bg-white', 'text-emerald-950', 'shadow-sm', 'font-bold');
        btn.classList.remove('text-slate-600', 'font-medium');

        const target = btn.getAttribute('data-target');
        allPanelIds.forEach(pId => {
          const el = document.getElementById(pId);
          if (!el) return;
          if (target === 'all' || pId === target) {
            el.classList.remove('hidden');
            togglePanel(pId, true);
            if (pId === target) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            el.classList.add('hidden');
          }
        });
      });
    });
  });

  safely('refresh button', () => {
    document.getElementById('quickSimulateBtn')?.addEventListener('click', refreshDashboard);
  });

  safely('inspect buttons (delegated)', () => {
    document.getElementById('dashboardRecentScansBody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-inspect-id]');
      if (btn) inspectScan(btn.dataset.inspectId);
    });
  });

  safely('bbox modal', () => {
    document.getElementById('toggleBboxBtn')?.addEventListener('click', () => {
      state.showBboxOverlay = !state.showBboxOverlay;
      if (state.activeInspectionScan) drawLeafInspectionCanvas(state.activeInspectionScan);
    });
    document.getElementById('toggleVeinBtn')?.addEventListener('click', () => {
      state.highVeinContrast = !state.highVeinContrast;
      if (state.activeInspectionScan) drawLeafInspectionCanvas(state.activeInspectionScan);
    });
    const closeModal = () => document.getElementById('bboxModal')?.classList.add('hidden');
    document.getElementById('closeBboxModal')?.addEventListener('click', closeModal);
    document.getElementById('closeBboxModalBottom')?.addEventListener('click', closeModal);
  });

  safely('charts', initCharts);
  updateKPIsAndCharts();
  renderRecentScansFeed();
});