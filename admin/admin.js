const API_URL = window.location.origin;
let inscripciones = [];
let filtroActual  = 'todos';
let token         = null;

// ── Fecha de la carrera: 14 de junio de 2026 ──
const FECHA_CARRERA = new Date(2026, 5, 14); // mes 5 = junio (0-indexed)

window.addEventListener('load', () => {
  const saved = localStorage.getItem('ciclon_admin_token');
  if (saved) { token = saved; showPanel(); load(); }
});

/* ══════════════════════════════
   LOGIN
══════════════════════════════ */
async function doLogin() {
  const usuario  = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const btn      = document.getElementById('loginBtn');
  const errEl    = document.getElementById('loginError');
  if (!usuario || !password) { showLoginError('Completá usuario y contraseña.'); return; }
  btn.textContent = 'Ingresando...'; btn.disabled = true; errEl.style.display = 'none';
  try {
    const res  = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    });
    const data = await res.json();
    if (!res.ok) { showLoginError(data.error || 'Credenciales incorrectas.'); return; }
    token = data.token;
    localStorage.setItem('ciclon_admin_token', token);
    showPanel(); load();
  } catch { showLoginError('No se pudo conectar al servidor.'); }
  finally   { btn.textContent = 'Ingresar →'; btn.disabled = false; }
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg; el.style.display = 'block';
}
function showPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display  = 'block';
}
function doLogout() {
  token = null; localStorage.removeItem('ciclon_admin_token');
  document.getElementById('adminPanel').style.display  = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').style.display  = 'none';
}

/* ══════════════════════════════
   API
══════════════════════════════ */
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
  if (res.status === 401) { doLogout(); throw new Error('Sesión expirada.'); }
  return res;
}

async function load() {
  document.getElementById('cardsList').innerHTML  = '<div class="state-msg">Cargando...</div>';
  document.getElementById('tableBody').innerHTML  = '<tr><td colspan="16" class="state-msg">Cargando...</td></tr>';
  try {
    const res = await apiFetch(`${API_URL}/inscripciones`);
    inscripciones = await res.json();
    // Guardar en sessionStorage para la página de categorías
    sessionStorage.setItem('ciclon_inscripciones', JSON.stringify(inscripciones));
    render();
  } catch(e) {
    if (e.message !== 'Sesión expirada.')
      document.getElementById('cardsList').innerHTML = '<div class="state-msg error">❌ No se pudo conectar.</div>';
  }
}

function setFilter(btn) {
  filtroActual = btn.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function render() {
  const items = filtroActual === 'todos'
    ? inscripciones
    : inscripciones.filter(i => i.estado === filtroActual);
  document.getElementById('counter').textContent = `${items.length} resultado${items.length !== 1 ? 's' : ''}`;
  renderCards(items);
  renderTable(items);
}

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function esPdf(url) {
  return url && (url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/'));
}

function fmtDni(dni) {
  const c = String(dni).replace(/\D/g, '');
  if (c.length === 8) return c.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
  if (c.length === 7) return c.replace(/(\d{1})(\d{3})(\d{3})/, '$1.$2.$3');
  return c;
}

function fmtFechaCorta(dt) {
  return new Date(dt).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function fmtFechaSimple(dt) {
  return new Date(dt).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function fmtSexo(s) {
  return { M: 'Masc.', F: 'Fem.', X: 'No bin.', NI: 'N/D' }[s] || s;
}

/**
 * Calcula la edad que tendrá el corredor el 14 de junio de 2026.
 * Tiene en cuenta si ya cumplió o no antes de esa fecha.
 */
function edadEnCarrera(fechaNac) {
  if (!fechaNac) return '—';
  const nac  = new Date(fechaNac);
  let edad   = FECHA_CARRERA.getFullYear() - nac.getFullYear();
  const yaCumplio =
    nac.getMonth() < FECHA_CARRERA.getMonth() ||
    (nac.getMonth() === FECHA_CARRERA.getMonth() && nac.getDate() <= FECHA_CARRERA.getDate());
  if (!yaCumplio) edad--;
  return edad;
}

/* ══════════════════════════════
   MOBILE CARDS
══════════════════════════════ */
function renderCards(items) {
  if (!items.length) {
    document.getElementById('cardsList').innerHTML = '<div class="state-msg">Sin resultados.</div>';
    return;
  }
  document.getElementById('cardsList').innerHTML = items.map(cardHTML).join('');
}

function cardHTML(i) {
  const initials = (i.nombre[0] + i.apellido[0]).toUpperCase();
  const badges   = { pendiente: 'badge-pendiente', confirmado: 'badge-confirmado', rechazado: 'badge-rechazado' };
  const isPdf    = esPdf(i.comprobanteUrl);
  const voucherHTML = isPdf
    ? `<div class="voucher-pdf-placeholder"><span>📄</span><span>comprobante.pdf</span></div>`
    : `<img src="${i.comprobanteUrl}" loading="lazy" alt="Comprobante">`;

  return `
  <div class="icard" id="icard-${i.id}">
    <div class="icard-summary" onclick="toggleCard(${i.id})">
      <div class="icard-avatar">${initials}</div>
      <div class="icard-main">
        <div class="icard-name">${i.nombre} ${i.apellido}</div>
        <div class="icard-meta">${i.carrera.toUpperCase()} · DNI ${fmtDni(i.dni)} · ${fmtFechaCorta(i.createdAt)}</div>
      </div>
      <div class="icard-right">
        <div class="icard-monto">$${i.monto.toLocaleString('es-AR')}</div>
        <span class="badge ${badges[i.estado]}">${i.estado}</span>
      </div>
      <span class="icard-chevron">▼</span>
    </div>
    <div class="icard-detail">
      <div class="detail-grid">
        <div class="detail-field"><div class="detail-label">Edad declarada</div><div class="detail-value">${i.edad} años</div></div>
        <div class="detail-field"><div class="detail-label">Edad 14/jun</div><div class="detail-value highlight">${edadEnCarrera(i.fechaNacimiento)} años</div></div>
        <div class="detail-field"><div class="detail-label">Sexo</div><div class="detail-value">${fmtSexo(i.sexo)}</div></div>
        <div class="detail-field"><div class="detail-label">Nacimiento</div><div class="detail-value">${i.fechaNacimiento ? fmtFechaSimple(i.fechaNacimiento) : '—'}</div></div>
        <div class="detail-field"><div class="detail-label">Remera</div><div class="detail-value">${i.remera === 'con' ? `Con remera · ${i.talle}` : 'Sin remera'}</div></div>
        <div class="detail-field full"><div class="detail-label">Ciudad</div><div class="detail-value">${i.ciudad}</div></div>
        <div class="detail-field full"><div class="detail-label">Domicilio</div><div class="detail-value">${i.domicilio}</div></div>
        <div class="detail-field full"><div class="detail-label">Email</div><div class="detail-value">${i.email}</div></div>
        <div class="detail-field"><div class="detail-label">Teléfono</div><div class="detail-value">+54 ${i.codarea} ${i.telefono}</div></div>
        <div class="detail-field"><div class="detail-label">Inscripción</div><div class="detail-value">${fmtFechaCorta(i.createdAt)}</div></div>
      </div>
      <div class="voucher-thumb" onclick="openModal('${i.comprobanteUrl}', '${i.nombre} ${i.apellido}')">
        ${voucherHTML}
        <div class="voucher-overlay"><span>🔍</span></div>
      </div>
      <div class="icard-actions">
        <button class="btn-confirm" onclick="confirmar(${i.id})" ${i.estado === 'confirmado' ? 'disabled' : ''}>${i.estado === 'confirmado' ? '✅ Confirmado' : 'Confirmar pago'}</button>
        <button class="btn-reject"  onclick="rechazar(${i.id})"  ${i.estado === 'rechazado'  ? 'disabled' : ''}>✕</button>
        <a class="btn-open" href="${i.comprobanteUrl}" target="_blank" title="Abrir en otra ventana">↗</a>
      </div>
    </div>
  </div>`;
}

function toggleCard(id) {
  document.getElementById(`icard-${id}`).classList.toggle('expanded');
}

/* ══════════════════════════════
   TABLA DESKTOP
   Columnas: Comprobante | Nombre | DNI | Nacimiento | Edad decl. | Edad 14/jun | Sexo | Carrera | Remera | Monto | Ciudad | Email | Teléfono | Inscripción | Estado | Acciones
══════════════════════════════ */
function renderTable(items) {
  if (!items.length) {
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="16"><div class="state-msg">Sin resultados.</div></td></tr>';
    return;
  }
  const badges = { pendiente: 'badge-pendiente', confirmado: 'badge-confirmado', rechazado: 'badge-rechazado' };
  document.getElementById('tableBody').innerHTML = items.map(i => {
    const isPdf = esPdf(i.comprobanteUrl);
    const thumb = isPdf
      ? `<div class="tbl-pdf" onclick="openModal('${i.comprobanteUrl}','${i.nombre} ${i.apellido}')" title="Ver">📄</div>`
      : `<img class="tbl-thumb" src="${i.comprobanteUrl}" loading="lazy" onclick="openModal('${i.comprobanteUrl}','${i.nombre} ${i.apellido}')" title="Ver">`;
    return `
    <tr>
      <td>${thumb}</td>
      <td class="td-name">${i.nombre} ${i.apellido}</td>
      <td class="muted">${fmtDni(i.dni)}</td>
      <td class="muted">${i.fechaNacimiento ? fmtFechaSimple(i.fechaNacimiento) : '—'}</td>
      <td class="muted">${i.edad}</td>
      <td class="td-edad-carrera">${edadEnCarrera(i.fechaNacimiento)}</td>
      <td class="muted">${fmtSexo(i.sexo)}</td>
      <td><strong>${i.carrera.toUpperCase()}</strong></td>
      <td class="muted">${i.remera === 'con' ? `Talle ${i.talle}` : 'Sin remera'}</td>
      <td class="td-monto">$${i.monto.toLocaleString('es-AR')}</td>
      <td class="muted">${i.ciudad}</td>
      <td class="muted" style="font-size:.78rem">${i.email}</td>
      <td class="muted">+54 ${i.codarea} ${i.telefono}</td>
      <td class="muted" style="font-size:.78rem">${fmtFechaCorta(i.createdAt)}</td>
      <td><span class="badge ${badges[i.estado]}">${i.estado}</span></td>
      <td>
        <div class="tbl-actions">
          <button class="tbl-btn confirm" onclick="confirmar(${i.id})" ${i.estado === 'confirmado' ? 'disabled' : ''}>${i.estado === 'confirmado' ? '✅' : '✓ Confirmar'}</button>
          <button class="tbl-btn reject"  onclick="rechazar(${i.id})"  ${i.estado === 'rechazado'  ? 'disabled' : ''}>✕</button>
          <a class="tbl-btn ext" href="${i.comprobanteUrl}" target="_blank">↗</a>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════
   CONFIRMAR / RECHAZAR
══════════════════════════════ */
async function confirmar(id) {
  if (!confirm('¿Confirmar la inscripción?')) return;
  try {
    const res = await apiFetch(`${API_URL}/inscripciones/${id}/confirmar`, { method: 'PATCH' });
    if (!res.ok) throw new Error();
    inscripciones.find(i => i.id === id).estado = 'confirmado';
    render();
  } catch { alert('Error al confirmar.'); }
}
async function rechazar(id) {
  if (!confirm('¿Rechazar esta inscripción?')) return;
  try {
    const res = await apiFetch(`${API_URL}/inscripciones/${id}/rechazar`, { method: 'PATCH' });
    if (!res.ok) throw new Error();
    inscripciones.find(i => i.id === id).estado = 'rechazado';
    render();
  } catch { alert('Error al rechazar.'); }
}

/* ══════════════════════════════
   MODAL PAN + ZOOM
══════════════════════════════ */
const canvas = document.getElementById('zoomCanvas');
const ctx    = canvas.getContext('2d');
let modalImg   = null;
let scale      = 1, minScale = 0.5;
let offsetX    = 0, offsetY  = 0;
let isDragging = false;
let lastX = 0,  lastY = 0, lastDist = 0;

function openModal(url, nombre) {
  if (esPdf(url)) { window.open(url, '_blank'); return; }
  document.getElementById('modalTitle').textContent = `Comprobante · ${nombre}`;
  document.getElementById('modalOpenLink').href     = url;
  document.getElementById('imgModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  modalImg = new Image();
  modalImg.crossOrigin = 'anonymous';
  modalImg.onload = () => { resizeCanvas(); fitImage(); drawFrame(); };
  modalImg.src = url;
}
function closeModal() {
  document.getElementById('imgModal').classList.remove('open');
  document.body.style.overflow = '';
  modalImg = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
function fitImage() {
  if (!modalImg) return;
  const pad    = 80;
  const scaleX = (canvas.width  - pad) / modalImg.width;
  const scaleY = (canvas.height - pad) / modalImg.height;
  scale    = Math.min(scaleX, scaleY, 1);
  minScale = scale * 0.5;
  offsetX  = (canvas.width  - modalImg.width  * scale) / 2;
  offsetY  = (canvas.height - modalImg.height * scale) / 2;
}
function drawFrame() {
  if (!modalImg) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.drawImage(modalImg, 0, 0);
  ctx.restore();
  requestAnimationFrame(drawFrame);
}
function applyZoom(delta, cx, cy) {
  const factor   = delta > 0 ? 1.15 : 1 / 1.15;
  const newScale = Math.max(minScale, Math.min(scale * factor, 8));
  const ratio    = newScale / scale;
  offsetX = cx - (cx - offsetX) * ratio;
  offsetY = cy - (cy - offsetY) * ratio;
  scale   = newScale;
}
function zoomIn()    { applyZoom(1,  canvas.width / 2, canvas.height / 2); }
function zoomOut()   { applyZoom(-1, canvas.width / 2, canvas.height / 2); }
function resetZoom() { fitImage(); }

canvas.addEventListener('wheel', e => { e.preventDefault(); applyZoom(-e.deltaY, e.clientX, e.clientY); }, { passive: false });
canvas.addEventListener('mousedown',  e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; canvas.classList.add('grabbing'); });
canvas.addEventListener('mousemove',  e => { if (!isDragging) return; offsetX += e.clientX - lastX; offsetY += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; });
canvas.addEventListener('mouseup',    () => { isDragging = false; canvas.classList.remove('grabbing'); });
canvas.addEventListener('mouseleave', () => { isDragging = false; canvas.classList.remove('grabbing'); });
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (e.touches.length === 1) { isDragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  else if (e.touches.length === 2) { isDragging = false; lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && isDragging) { offsetX += e.touches[0].clientX - lastX; offsetY += e.touches[0].clientY - lastY; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  else if (e.touches.length === 2) {
    const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const cx   = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy   = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    applyZoom(dist - lastDist, cx, cy);
    lastDist = dist;
  }
}, { passive: false });
canvas.addEventListener('touchend', e => { if (e.touches.length === 0) isDragging = false; });
window.addEventListener('resize', () => { if (document.getElementById('imgModal').classList.contains('open')) { resizeCanvas(); fitImage(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });