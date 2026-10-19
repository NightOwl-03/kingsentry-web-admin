

const appState = {
  activeUserId: null,
  activeScan: null,
  viewMode: 'cards', 
  showBboxOverlay: true,
  highVeinContrast: false
};

function drawDurianLeaf(canvas, scan, options = {}) {
  if (!canvas || !scan) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const showBbox = options.showBbox !== undefined ? options.showBbox : true;
  const highContrast = options.highContrast || false;
  const isThumbnail = options.isThumbnail || false;

  ctx.clearRect(0, 0, w, h);

  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#0c2217');
  bgGrad.addColorStop(0.5, '#07160f');
  bgGrad.addColorStop(1, '#040d09');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(66, 184, 131, 0.05)';
  ctx.lineWidth = 1;
  const gridStep = isThumbnail ? 30 : 40;
  for (let x = 0; x < w; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += gridStep) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(66, 184, 131, 0.25)';
  ctx.lineWidth = 1.5;
  const bLen = isThumbnail ? 10 : 16;
  ctx.beginPath(); ctx.moveTo(8, 8 + bLen); ctx.lineTo(8, 8); ctx.lineTo(8 + bLen, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - 8 - bLen, 8); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8, 8 + bLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, h - 8 - bLen); ctx.lineTo(8, h - 8); ctx.lineTo(8 + bLen, h - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - 8 - bLen, h - 8); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8, h - 8 - bLen); ctx.stroke();

  ctx.save();

  const padX = w * 0.12;
  const midY = h * 0.5;
  const leafW = w - padX * 2;
  const startX = padX;
  const endX = w - padX;

  ctx.beginPath();
  ctx.moveTo(startX, midY);
  ctx.bezierCurveTo(startX + leafW * 0.2, midY - h * 0.36, startX + leafW * 0.7, midY - h * 0.36, endX, midY);
  ctx.bezierCurveTo(startX + leafW * 0.7, midY + h * 0.36, startX + leafW * 0.2, midY + h * 0.36, startX, midY);
  ctx.closePath();

  const leafGrad = ctx.createLinearGradient(startX, midY - h * 0.3, endX, midY + h * 0.3);
  if (highContrast) {
    leafGrad.addColorStop(0, '#0c2e1f');
    leafGrad.addColorStop(0.5, '#174730');
    leafGrad.addColorStop(1, '#091d13');
  } else {
    leafGrad.addColorStop(0, '#235940');
    leafGrad.addColorStop(0.35, '#38835d');
    leafGrad.addColorStop(0.7, '#1f4e37');
    leafGrad.addColorStop(1, '#112b1f');
  }
  ctx.fillStyle = leafGrad;
  ctx.fill();

  ctx.strokeStyle = highContrast ? 'rgba(167, 243, 208, 0.6)' : 'rgba(66, 184, 131, 0.4)';
  ctx.lineWidth = isThumbnail ? 1.5 : 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(startX - 6, midY);
  ctx.quadraticCurveTo(startX + leafW * 0.5, midY - 2, endX + 4, midY);
  ctx.lineWidth = highContrast ? (isThumbnail ? 3 : 4) : (isThumbnail ? 2 : 3);
  ctx.strokeStyle = highContrast ? '#a7f3d0' : '#74c69d';
  ctx.stroke();

  const veinStep = isThumbnail ? 22 : 32;
  const veinColor = highContrast ? 'rgba(167, 243, 208, 0.45)' : 'rgba(116, 198, 157, 0.28)';
  ctx.lineWidth = isThumbnail ? 1 : 1.5;
  ctx.strokeStyle = veinColor;

  for (let x = startX + 24; x <= endX - 24; x += veinStep) {
    const norm = (x - startX) / leafW;
    const archH = Math.sin(norm * Math.PI) * (h * 0.28);
    ctx.beginPath();
    ctx.moveTo(x, midY);
    ctx.quadraticCurveTo(x + 18, midY - archH * 0.55, x + 28, midY - archH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, midY);
    ctx.quadraticCurveTo(x + 18, midY + archH * 0.55, x + 28, midY + archH);
    ctx.stroke();
  }

  const scaleX = w / 560;
  const scaleY = h / 380;
  const lesionCenterX = (scan.bbox.x + scan.bbox.w / 2) * scaleX;
  const lesionCenterY = (scan.bbox.y + scan.bbox.h / 2) * scaleY;

  if (scan.detectedClass === 'Leaf Blight') {
    const rad = isThumbnail ? 32 : 55;
    const blightGrad = ctx.createRadialGradient(lesionCenterX, lesionCenterY, 6, lesionCenterX, lesionCenterY, rad);
    blightGrad.addColorStop(0, '#2d090b');
    blightGrad.addColorStop(0.35, '#6a181c');
    blightGrad.addColorStop(0.65, '#bc4749');
    blightGrad.addColorStop(0.85, '#d4a373');
    blightGrad.addColorStop(1, 'rgba(212, 163, 115, 0)');
    ctx.fillStyle = blightGrad;

    ctx.beginPath();
    const bx = lesionCenterX;
    const by = lesionCenterY;
    const s = isThumbnail ? 0.6 : 1.0;
    ctx.moveTo(bx - 35 * s, by - 20 * s);
    ctx.bezierCurveTo(bx - 15 * s, by - 50 * s, bx + 45 * s, by - 35 * s, bx + 40 * s, by + 10 * s);
    ctx.bezierCurveTo(bx + 35 * s, by + 45 * s, bx - 10 * s, by + 50 * s, bx - 40 * s, by + 25 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(24, 6, 7, 0.9)';
    ctx.beginPath();
    ctx.arc(lesionCenterX, lesionCenterY, isThumbnail ? 10 : 16, 0, Math.PI * 2);
    ctx.fill();

  } else if (scan.detectedClass === 'Leaf Spot') {
    const rad = isThumbnail ? 22 : 36;
    const spotGrad = ctx.createRadialGradient(lesionCenterX, lesionCenterY, 3, lesionCenterX, lesionCenterY, rad);
    spotGrad.addColorStop(0, '#4a321d');
    spotGrad.addColorStop(0.45, '#996738');
    spotGrad.addColorStop(0.75, '#d4a373');
    spotGrad.addColorStop(1, 'rgba(212, 163, 115, 0)');
    ctx.fillStyle = spotGrad;

    ctx.beginPath();
    ctx.arc(lesionCenterX, lesionCenterY, rad, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(74, 50, 29, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(lesionCenterX, lesionCenterY, isThumbnail ? 9 : 15, 0, Math.PI * 2);
    ctx.stroke();

    const satX = lesionCenterX + (isThumbnail ? 20 : 30);
    const satY = lesionCenterY - (isThumbnail ? 14 : 22);
    ctx.beginPath();
    ctx.arc(satX, satY, isThumbnail ? 7 : 11, 0, Math.PI * 2);
    ctx.fillStyle = '#a67240';
    ctx.fill();
    ctx.strokeStyle = '#593a1c';
    ctx.stroke();
  }

  ctx.restore();

  if (showBbox) {
    const bx = scan.bbox.x * scaleX;
    const by = scan.bbox.y * scaleY;
    const bw = scan.bbox.w * scaleX;
    const bh = scan.bbox.h * scaleY;

    let color = '#42b883';
    let fillColor = 'rgba(66, 184, 131, 0.12)';
    if (scan.detectedClass === 'Leaf Blight') {
      color = '#bc4749';
      fillColor = 'rgba(188, 71, 73, 0.22)';
    } else if (scan.detectedClass === 'Leaf Spot') {
      color = '#d4a373';
      fillColor = 'rgba(212, 163, 115, 0.2)';
    }

    ctx.fillStyle = fillColor;
    ctx.fillRect(bx, by, bw, bh);

    ctx.strokeStyle = color;
    ctx.lineWidth = isThumbnail ? 1.5 : 2;
    ctx.strokeRect(bx, by, bw, bh);

    const cLen = isThumbnail ? 8 : 14;
    ctx.lineWidth = isThumbnail ? 2.5 : 3.5;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen); ctx.stroke();

    const labelText = `${scan.detectedClass} ${scan.confidence.toFixed(1)}%`;
    ctx.font = isThumbnail ? 'bold 9px Inter, sans-serif' : 'bold 11px Inter, sans-serif';
    const tagPadding = isThumbnail ? 10 : 16;
    const tagHeight = isThumbnail ? 17 : 22;
    const tagWidth = ctx.measureText(labelText).width + tagPadding;

    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx, by - tagHeight - 2, tagWidth, tagHeight, [4, 4, 0, 0]);
    } else {
      ctx.rect(bx, by - tagHeight - 2, tagWidth, tagHeight);
    }
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, bx + 5, by - (isThumbnail ? 5 : 7));

    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
    ctx.stroke();
  }
}

async function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="py-12 text-center text-slate-400 text-sm">
        <i data-lucide="users" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
        Walay scan records nga nakita sa database.
      </td>
    </tr>
  `;
  document.getElementById('displayedUserCount').textContent = "0";
  document.getElementById('statTotalUsers').textContent = "0 Farmers / Staff";
  document.getElementById('statTotalScans').textContent = "0 Records";
  lucide.createIcons();
}

function selectUser(userId) {
  const user = repositoryUsers.find(u => u.id === userId);
  if (!user) return;

  appState.activeUserId = userId;

  const breadcrumbEl = document.getElementById('breadcrumbUserName');
  const nameEl = document.getElementById('userHeaderName');
  const avatarEl = document.getElementById('userAvatarLarge');
  const emailEl = document.getElementById('userHeaderEmail');
  const zoneEl = document.getElementById('userHeaderZone');
  const latestEl = document.getElementById('userHeaderLatest');
  const badgeEl = document.getElementById('userScanBadge');
  const roleEl = document.getElementById('userRoleBadge');

  if (breadcrumbEl) breadcrumbEl.textContent = user.name;
  if (nameEl) nameEl.textContent = user.name;
  if (avatarEl) avatarEl.textContent = user.avatarInitials;
  if (emailEl) emailEl.textContent = user.email;
  if (zoneEl) zoneEl.textContent = user.zone;
  if (latestEl) latestEl.textContent = `${user.latestScan} — ${user.latestScanTime}`;
  if (roleEl) roleEl.textContent = user.role;

  const scans = userScansStore[userId] || [];
  if (badgeEl) badgeEl.textContent = `${scans.length} Scan Records`;

  const searchInput = document.getElementById('scanSearchInput');
  const diseaseSelect = document.getElementById('scanFilterDisease');
  const riskSelect = document.getElementById('scanFilterRisk');
  if (searchInput) searchInput.value = '';
  if (diseaseSelect) diseaseSelect.value = 'ALL';
  if (riskSelect) riskSelect.value = 'ALL';

  const userListView = document.getElementById('userListView');
  const userScanView = document.getElementById('userScanView');

  if (userListView && userScanView) {
    userListView.classList.add('hidden');
    userScanView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderUserScans();
  showToast(`Opened scan repository for ${user.name} (${scans.length} records)`, 'Healthy');
}

function backToUsers() {
  appState.activeUserId = null;
  const userListView = document.getElementById('userListView');
  const userScanView = document.getElementById('userScanView');

  if (userListView && userScanView) {
    userScanView.classList.add('hidden');
    userListView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  renderUsersTable();
}

function renderUserScans() {
  const userId = appState.activeUserId;
  if (!userId) return;

  const scans = userScansStore[userId] || [];
  const search = (document.getElementById('scanSearchInput')?.value || '').toLowerCase().trim();
  const filterDisease = document.getElementById('scanFilterDisease')?.value || 'ALL';
  const filterRisk = document.getElementById('scanFilterRisk')?.value || 'ALL';

  const totalCount = scans.length;
  const blightCount = scans.filter(s => s.detectedClass === 'Leaf Blight').length;
  const spotCount = scans.filter(s => s.detectedClass === 'Leaf Spot').length;
  const healthyCount = scans.filter(s => s.detectedClass === 'Healthy').length;

  document.getElementById('metricTotal').textContent = totalCount;
  document.getElementById('metricBlight').textContent = blightCount;
  document.getElementById('metricSpot').textContent = spotCount;
  document.getElementById('metricHealthy').textContent = healthyCount;

  const filtered = scans.filter(scan => {
    const matchSearch = !search ||
      scan.id.toLowerCase().includes(search) ||
      scan.treeId.toLowerCase().includes(search) ||
      scan.treeNumber.toLowerCase().includes(search);

    const matchDisease = filterDisease === 'ALL' || scan.detectedClass === filterDisease;
    const matchRisk = filterRisk === 'ALL' || scan.riskLevel.toLowerCase() === filterRisk.toLowerCase();

    return matchSearch && matchDisease && matchRisk;
  });

  const cardsContainer = document.getElementById('userScansGrid');
  const tableContainer = document.getElementById('userScansTableContainer');
  const tableBody = document.getElementById('userScansTableBody');
  const emptyState = document.getElementById('userScansEmptyState');

  if (filtered.length === 0) {
    if (cardsContainer) cardsContainer.innerHTML = '';
    if (tableBody) tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  if (cardsContainer) {
    cardsContainer.innerHTML = '';

    filtered.forEach(scan => {
      let riskBadgeClass = 'badge-risk-low';
      let riskTextColor = 'text-emerald-700';
      let riskIcon = 'check-circle-2';
      let dotColor = 'bg-emerald-500';
      let barColor = 'bg-[#2d6a4f]';
      let diseaseBadgeClass = 'bg-emerald-100 text-[#1b4332] border border-emerald-300';

      if (scan.riskLevel === 'High') {
        riskBadgeClass = 'badge-risk-high';
        riskTextColor = 'text-rose-600';
        riskIcon = 'alert-octagon';
        dotColor = 'bg-rose-500';
        barColor = 'bg-[#bc4749]';
        diseaseBadgeClass = 'bg-rose-100 text-[#bc4749] border border-rose-300';
      } else if (scan.riskLevel === 'Moderate') {
        riskBadgeClass = 'badge-risk-moderate';
        riskTextColor = 'text-amber-700';
        riskIcon = 'alert-triangle';
        dotColor = 'bg-amber-500';
        barColor = 'bg-[#d4a373]';
        diseaseBadgeClass = 'bg-amber-100 text-amber-900 border border-amber-300';
      }

      const card = document.createElement('div');
      card.className = 'scan-card bg-white rounded-3xl border border-slate-200/90 shadow-card overflow-hidden flex flex-col group';
      card.innerHTML = `
        <!-- Card Top Bar: Scan ID & Risk Level -->
        <div class="px-5 py-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full ${dotColor}"></span>
            <span class="font-mono font-bold text-slate-900 text-sm tracking-tight">${scan.id}</span>
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${riskBadgeClass}">
            <i data-lucide="${riskIcon}" class="w-3 h-3 mr-1"></i>
            Risk: ${scan.riskLevel}
          </span>
        </div>

        <!-- Durian Leaf Photo Canvas Preview -->
        <div class="leaf-card-viewport h-48 sm:h-52 relative border-b border-slate-100">
          <canvas id="canvas-${scan.id}" width="380" height="220" class="w-full h-full object-cover"></canvas>
          
          <div class="absolute top-3 left-3 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>YOLO26-CV • ${scan.latency}</span>
          </div>

          <div class="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-300 border border-slate-700/40">
            ${scan.cultivar}
          </div>
        </div>

        <!-- Card Body Details -->
        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div class="space-y-2.5 text-xs text-slate-600">
            
            <!-- Disease Result -->
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-medium">Disease:</span>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${diseaseBadgeClass}">
                ${scan.detectedClass}
              </span>
            </div>

            <!-- Confidence Score -->
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-medium">Confidence:</span>
              <div class="flex items-center space-x-2">
                <div class="w-20 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div class="h-full rounded-full ${barColor}" style="width: ${scan.confidence}%"></div>
                </div>
                <span class="font-mono text-xs font-bold text-slate-800">${scan.confidence.toFixed(1)}%</span>
              </div>
            </div>

            <!-- Risk Level -->
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-medium">Risk Level:</span>
              <span class="font-bold text-xs ${riskTextColor}">${scan.riskLevel}</span>
            </div>

            <!-- Farm Zone -->
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-medium">Farm Zone:</span>
              <span class="font-semibold text-slate-800 text-right truncate max-w-[190px]">${scan.zone}</span>
            </div>

            <!-- Tree -->
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-medium">Tree:</span>
              <span class="font-semibold text-slate-800">${scan.treeNumber || scan.treeId}</span>
            </div>

            <!-- Scanned Timestamp -->
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-medium">Scanned:</span>
              <span class="text-slate-700 font-medium text-[11px]">${scan.timestampFull || scan.timestamp}</span>
            </div>
          </div>

          <!-- Inspect / View Button -->
          <button onclick="openScanDetailsModal('${scan.id}')"
            class="w-full mt-2 py-2.5 px-4 rounded-xl bg-leafGreen hover:bg-emerald-700 text-white text-xs font-bold shadow flex items-center justify-center space-x-2 transition-all active:scale-95">
            <i data-lucide="scan" class="w-4 h-4 text-leafMint"></i>
            <span>View Scan</span>
          </button>
        </div>
      `;

      cardsContainer.appendChild(card);

      setTimeout(() => {
        const leafCanvas = document.getElementById(`canvas-${scan.id}`);
        if (leafCanvas) {
          drawDurianLeaf(leafCanvas, scan, { isThumbnail: true, showBbox: true });
        }
      }, 10);
    });
  }

  if (tableBody) {
    tableBody.innerHTML = '';

    filtered.forEach(scan => {
      let riskBadgeClass = 'badge-risk-low';
      let diseaseBadgeClass = 'bg-emerald-100 text-[#1b4332] border border-emerald-300';
      if (scan.riskLevel === 'High') {
        riskBadgeClass = 'badge-risk-high';
        diseaseBadgeClass = 'bg-rose-100 text-[#bc4749] border border-rose-300';
      } else if (scan.riskLevel === 'Moderate') {
        riskBadgeClass = 'badge-risk-moderate';
        diseaseBadgeClass = 'bg-amber-100 text-amber-900 border border-amber-300';
      }

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition-colors';
      tr.innerHTML = `
        <td class="py-3 px-4 font-mono font-bold text-slate-800">${scan.id}</td>
        <td class="py-3 px-4">
          <div class="w-16 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
            <canvas id="table-canvas-${scan.id}" width="120" height="75" class="w-full h-full object-cover"></canvas>
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-800 text-xs">${scan.zone}</div>
          <div class="text-[11px] text-slate-400">${scan.treeId}</div>
        </td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${diseaseBadgeClass}">
            ${scan.detectedClass}
          </span>
        </td>
        <td class="py-3 px-4 font-mono text-xs font-bold text-slate-800">${scan.confidence.toFixed(1)}%</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${riskBadgeClass}">
            ${scan.riskLevel}
          </span>
        </td>
        <td class="py-3 px-4 text-xs text-slate-600">${scan.timestampFull}</td>
        <td class="py-3 px-4 text-center">
          <button onclick="openScanDetailsModal('${scan.id}')"
            class="px-3 py-1.5 rounded-xl bg-leafGreen hover:bg-emerald-700 text-white text-xs font-bold shadow transition-all active:scale-95">
            View Scan
          </button>
        </td>
      `;
      tableBody.appendChild(tr);

      setTimeout(() => {
        const tableCanvas = document.getElementById(`table-canvas-${scan.id}`);
        if (tableCanvas) {
          drawDurianLeaf(tableCanvas, scan, { isThumbnail: true, showBbox: false });
        }
      }, 10);
    });
  }

  lucide.createIcons();
}

function openScanDetailsModal(scanId) {
  let foundScan = null;
  let submitterName = "Registered Sentry User";

  for (const [userId, userScans] of Object.entries(userScansStore)) {
    const s = userScans.find(item => item.id === scanId);
    if (s) {
      foundScan = s;
      const user = repositoryUsers.find(u => u.id === userId);
      if (user) submitterName = `${user.name} (${user.role})`;
      break;
    }
  }

  if (!foundScan) return;
  appState.activeScan = foundScan;

  document.getElementById('modalScanIdTitle').textContent = `Scan Details: ${foundScan.id}`;
  document.getElementById('modalSubTitle').textContent = `Recorded by ${submitterName} • ${foundScan.timestampFull}`;
  document.getElementById('modalScanId').textContent = foundScan.id;
  document.getElementById('modalSubmitter').textContent = submitterName;
  document.getElementById('modalConfidence').textContent = `${foundScan.confidence.toFixed(1)}%`;
  document.getElementById('modalZone').textContent = foundScan.zone;
  document.getElementById('modalTree').textContent = `${foundScan.treeId || foundScan.treeNumber} (${foundScan.cultivar || 'Durian'})`;
  document.getElementById('modalTimestamp').textContent = foundScan.timestampFull || foundScan.timestamp;
  document.getElementById('modalCoords').textContent = `[x:${foundScan.bbox.x}, y:${foundScan.bbox.y}, w:${foundScan.bbox.w}, h:${foundScan.bbox.h}]`;
  document.getElementById('modalRemedyRecommendation').textContent = foundScan.advisory || foundScan.notes;

  const diagBadge = document.getElementById('modalDiagnosisBadge');
  let diagBadgeClass = 'bg-emerald-100 text-[#1b4332] border border-emerald-300';
  if (foundScan.detectedClass === 'Leaf Blight') diagBadgeClass = 'bg-rose-100 text-[#bc4749] border border-rose-300';
  else if (foundScan.detectedClass === 'Leaf Spot') diagBadgeClass = 'bg-amber-100 text-amber-900 border border-amber-300';

  diagBadge.className = `inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold ${diagBadgeClass}`;
  diagBadge.textContent = foundScan.detectedClass;

  const riskBadge = document.getElementById('modalRiskBadge');
  const riskAssessmentText = document.getElementById('modalRiskAssessment');
  let riskBadgeClass = 'badge-risk-low';
  let assessmentSummary = 'Optimal Health — zero active foliar pathogen transmission.';

  if (foundScan.riskLevel === 'High') {
    riskBadgeClass = 'badge-risk-high';
    assessmentSummary = 'High Risk — Acute foliar blight detected. Urgent systemic intervention required.';
  } else if (foundScan.riskLevel === 'Moderate') {
    riskBadgeClass = 'badge-risk-moderate';
    assessmentSummary = 'Moderate Risk — Chlorotic foliar spot lesions. Protective barrier spray advised.';
  }

  riskBadge.className = `inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold ${riskBadgeClass}`;
  riskBadge.textContent = `Risk: ${foundScan.riskLevel}`;
  riskAssessmentText.textContent = assessmentSummary;

  const modalCanvas = document.getElementById('modalCanvas');
  if (modalCanvas) {
    drawDurianLeaf(modalCanvas, foundScan, {
      showBbox: appState.showBboxOverlay,
      highContrast: appState.highVeinContrast,
      isThumbnail: false
    });
  }

  const modal = document.getElementById('scanDetailsModal');
  if (modal) modal.classList.remove('hidden');
}

function closeScanDetailsModal() {
  const modal = document.getElementById('scanDetailsModal');
  if (modal) modal.classList.add('hidden');
  appState.activeScan = null;
}

function simulateScanForActiveUser() {
  const userId = appState.activeUserId || "USR-001";
  const user = repositoryUsers.find(u => u.id === userId);
  const userScans = userScansStore[userId];
  if (!user || !userScans) return;

  const randomNum = Math.floor(Math.random() * 800) + 200;
  const scanId = `KS-2026-0${randomNum}`;
  const cultivars = ['Puyat Cultivar', 'Duyaya Cultivar', 'Arancillo Cultivar'];
  const treeNum = `#${Math.floor(Math.random() * 350) + 1}`;
  const cultivar = cultivars[Math.floor(Math.random() * cultivars.length)];

  const rand = Math.random();
  let detectedClass = 'Healthy';
  let riskLevel = 'Low';
  let bbox = { x: 85, y: 70, w: 380, h: 240 };
  let notes = "Optimal foliar vigor and rich chlorophyll saturation without pathogen lesions.";
  let advisory = "Maintain standard orchard nutritional foliar spray schedule.";

  if (rand > 0.65) {
    detectedClass = 'Leaf Blight';
    riskLevel = 'High';
    bbox = { x: 140, y: 105, w: 215, h: 160 };
    notes = "Acute necrotic blight spreading along main lateral vein. High humidity risk.";
    advisory = "Immediately spray systemic Ridomil Gold MZ at 2.5g/L. Isolate affected branches.";
  } else if (rand > 0.35) {
    detectedClass = 'Leaf Spot';
    riskLevel = 'Moderate';
    bbox = { x: 190, y: 130, w: 145, h: 125 };
    notes = "Target-board circular chlorotic spot observed on adaxial leaf lamina.";
    advisory = "Preventive application of Copper Oxychloride 50 WP during early morning.";
  }

  const confidence = parseFloat((Math.random() * 6 + 93.5).toFixed(1));
  const latency = (Math.random() * 3 + 11.5).toFixed(1) + " ms";

  const newScan = {
    id: scanId,
    detectedClass,
    confidence,
    riskLevel,
    zone: user.zone,
    treeNumber: treeNum,
    treeId: `Tree ${treeNum} (${cultivar.split(' ')[0]})`,
    cultivar,
    timestamp: "Just now",
    timestampFull: "September 24, 2026 — Just now",
    latency,
    bbox,
    notes,
    advisory,
    gps: "6.8124° N, 125.4021° E"
  };

  userScans.unshift(newScan);
  user.latestScan = "Just now";
  user.latestScanTime = "Moments ago";

  if (appState.activeUserId) {
    document.getElementById('userScanBadge').textContent = `${userScans.length} Scan Records`;
    renderUserScans();
  }
  renderUsersTable();

  showToast(`New Scan Recorded: ${scanId} (${detectedClass}) for ${user.name}`, detectedClass);
}

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  renderUsersTable();

  const userSearch = document.getElementById('userSearchInput');
  if (userSearch) {
    userSearch.addEventListener('input', renderUsersTable);
  }

  const userRole = document.getElementById('userRoleFilter');
  if (userRole) {
    userRole.addEventListener('change', renderUsersTable);
  }

  const backBtn = document.getElementById('backToUsersBtn');
  if (backBtn) {
    backBtn.addEventListener('click', backToUsers);
  }

  const scanSearch = document.getElementById('scanSearchInput');
  if (scanSearch) {
    scanSearch.addEventListener('input', renderUserScans);
  }

  const scanDiseaseFilter = document.getElementById('scanFilterDisease');
  if (scanDiseaseFilter) {
    scanDiseaseFilter.addEventListener('change', renderUserScans);
  }

  const scanRiskFilter = document.getElementById('scanFilterRisk');
  if (scanRiskFilter) {
    scanRiskFilter.addEventListener('change', renderUserScans);
  }

  const clearFiltersBtn = document.getElementById('clearScanFiltersBtn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (scanSearch) scanSearch.value = '';
      if (scanDiseaseFilter) scanDiseaseFilter.value = 'ALL';
      if (scanRiskFilter) scanRiskFilter.value = 'ALL';
      renderUserScans();
    });
  }

  const cardsBtn = document.getElementById('viewModeCardsBtn');
  const tableBtn = document.getElementById('viewModeTableBtn');
  const gridContainer = document.getElementById('userScansGrid');
  const tableContainer = document.getElementById('userScansTableContainer');

  if (cardsBtn && tableBtn) {
    cardsBtn.addEventListener('click', () => {
      appState.viewMode = 'cards';
      cardsBtn.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-xs';
      tableBtn.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all';
      if (gridContainer) gridContainer.classList.remove('hidden');
      if (tableContainer) tableContainer.classList.add('hidden');
      renderUserScans();
    });

    tableBtn.addEventListener('click', () => {
      appState.viewMode = 'table';
      tableBtn.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-xs';
      cardsBtn.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all';
      if (gridContainer) gridContainer.classList.add('hidden');
      if (tableContainer) tableContainer.classList.remove('hidden');
      renderUserScans();
    });
  }

  const simulateUserScanBtn = document.getElementById('simulateUserScanBtn');
  if (simulateUserScanBtn) {
    simulateUserScanBtn.addEventListener('click', simulateScanForActiveUser);
  }

  const quickSimulateBtn = document.getElementById('quickSimulateBtn');
  if (quickSimulateBtn) {
    quickSimulateBtn.addEventListener('click', simulateScanForActiveUser);
  }

  const closeModalBtn = document.getElementById('closeModalBtn');
  const closeModalBottomBtn = document.getElementById('closeModalBottomBtn');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeScanDetailsModal);
  if (closeModalBottomBtn) closeModalBottomBtn.addEventListener('click', closeScanDetailsModal);

  const modalEl = document.getElementById('scanDetailsModal');
  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeScanDetailsModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeScanDetailsModal();
  });

  const toggleBboxBtn = document.getElementById('toggleBboxBtn');
  if (toggleBboxBtn) {
    toggleBboxBtn.addEventListener('click', () => {
      appState.showBboxOverlay = !appState.showBboxOverlay;
      if (appState.activeScan) {
        const modalCanvas = document.getElementById('modalCanvas');
        drawDurianLeaf(modalCanvas, appState.activeScan, {
          showBbox: appState.showBboxOverlay,
          highContrast: appState.highVeinContrast,
          isThumbnail: false
        });
      }
    });
  }

  const toggleVeinBtn = document.getElementById('toggleVeinBtn');
  if (toggleVeinBtn) {
    toggleVeinBtn.addEventListener('click', () => {
      appState.highVeinContrast = !appState.highVeinContrast;
      if (appState.activeScan) {
        const modalCanvas = document.getElementById('modalCanvas');
        drawDurianLeaf(modalCanvas, appState.activeScan, {
          showBbox: appState.showBboxOverlay,
          highContrast: appState.highVeinContrast,
          isThumbnail: false
        });
      }
    });
  }

  if (window.location.hash) {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('juan')) selectUser('USR-001');
    else if (hash.includes('pedro')) selectUser('USR-002');
    else if (hash.includes('maria')) selectUser('USR-003');
  }
});
