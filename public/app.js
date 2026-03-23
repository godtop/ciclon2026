/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let selectedRace  = null;
let selectedShirt = null;
let termsAccepted = false;
let voucherFile   = null;

const API_URL = window.location.origin; // Cambiar por tu URL de producción

const PRICES = {
  '4k':  { con: 23000, sin: 15000 },
  '10k': { con: 30000, sin: 22000 }
};

/* ══════════════════════════════════════
   FECHA DE NACIMIENTO — poblar selects
══════════════════════════════════════ */

// Poblar años (año actual hacia atrás hasta 1920)
(function poblarAnios() {
  const sel = document.getElementById('fnAnio');
  const hoy = new Date().getFullYear();
  for (let a = hoy; a >= 1920; a--) {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    sel.appendChild(opt);
  }
})();

// Poblar días según mes y año seleccionados (corrige coherencia)
function poblarDias() {
  const selDia  = document.getElementById('fnDia');
  const mes     = document.getElementById('fnMes').value;
  const anio    = document.getElementById('fnAnio').value;
  const diaActual = selDia.value;

  // Cuántos días tiene el mes seleccionado (o 31 si aún no hay mes)
  const maxDias = (mes && anio)
    ? new Date(parseInt(anio), parseInt(mes), 0).getDate()
    : 31;

  // Limpiar y repoblar
  selDia.innerHTML = '<option value="" disabled selected>Día</option>';
  for (let d = 1; d <= maxDias; d++) {
    const opt = document.createElement('option');
    opt.value = String(d).padStart(2, '0');
    opt.textContent = d;
    // Mantener el día que tenía si sigue siendo válido
    if (opt.value === diaActual) opt.selected = true;
    selDia.appendChild(opt);
  }
}

// Poblar días al inicio y cada vez que cambia mes o año
poblarDias();
document.getElementById('fnMes').addEventListener('change', poblarDias);
document.getElementById('fnAnio').addEventListener('change', poblarDias);

// Devuelve la fecha en formato YYYY-MM-DD para el backend, o '' si incompleta
function getFechaNacimiento() {
  const dia  = document.getElementById('fnDia').value;
  const mes  = document.getElementById('fnMes').value;
  const anio = document.getElementById('fnAnio').value;
  if (!dia || !mes || !anio) return '';
  return `${anio}-${mes}-${dia}`;
}

/* ══════════════════════════════════════
   STEP 1
══════════════════════════════════════ */
document.querySelectorAll('input[name="race"]').forEach(radio => {
  radio.addEventListener('change', () => {
    selectedRace  = radio.value;
    selectedShirt = null;
    document.querySelectorAll('.shirt-option').forEach(o => o.classList.remove('selected'));
    document.querySelectorAll('input[name="shirt"]').forEach(r => r.checked = false);
    document.querySelectorAll('.race-option').forEach(opt => opt.classList.remove('selected'));
    radio.closest('.race-option').classList.add('selected');
    const prices = PRICES[selectedRace];
    document.getElementById('shirtConPrice').textContent = `$${prices.con.toLocaleString('es-AR')}`;
    document.getElementById('shirtSinPrice').textContent = `$${prices.sin.toLocaleString('es-AR')}`;
    document.getElementById('shirtSelector').style.display = 'block';
    document.getElementById('raceError').style.display  = 'none';
    document.getElementById('shirtError').style.display = 'none';

    setTimeout(() => {
      document.querySelector('#step1 .btn').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
  });
});

document.querySelectorAll('input[name="shirt"]').forEach(radio => {
  radio.addEventListener('change', () => {
    selectedShirt = radio.value;
    document.querySelectorAll('.shirt-option').forEach(o => o.classList.remove('selected'));
    radio.closest('.shirt-option').classList.add('selected');
    document.getElementById('shirtError').style.display = 'none';

    setTimeout(() => {
      document.querySelector('#step1 .btn').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  });
});

/* ══════════════════════════════════════
   CIUDAD — MODAL CON BÚSQUEDA LOCAL
══════════════════════════════════════ */
let ciudadSeleccionada   = '';
let ciudadProvSeleccionada = '';
let todasLasLocalidades  = [];
let ciudadesListo        = false;

(async function cargarLocalidades() {
  try {
    const url  = 'https://apis.datos.gob.ar/georef/api/localidades?max=5000&campos=nombre,provincia.nombre&orden=nombre';
    const res  = await fetch(url);
    const data = await res.json();
    todasLasLocalidades = (data.localidades || [])
      .map(l => ({ nombre: l.nombre, provincia: l.provincia.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    ciudadesListo = true;
    document.getElementById('ciudadLoading').style.display = 'none';
    renderCiudades('');
  } catch {
    document.getElementById('ciudadLoading').textContent = '⚠️ Error al cargar. Intentá de nuevo.';
  }
})();

function abrirModalCiudad() {
  document.getElementById('ciudadModal').classList.add('open');
  document.getElementById('ciudadSearchInput').value = '';
  if (ciudadesListo) renderCiudades('');
  setTimeout(() => document.getElementById('ciudadSearchInput').focus(), 150);
}

function cerrarModalCiudad() {
  document.getElementById('ciudadModal').classList.remove('open');
}

function renderCiudades(q) {
  if (!ciudadesListo) return;
  const lista  = document.getElementById('ciudadLista');
  const texto  = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtradas = q.length === 0
    ? todasLasLocalidades.slice(0, 120)
    : todasLasLocalidades.filter(l => {
        const nombre = l.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nombre.includes(texto);
      }).slice(0, 100);

  if (!filtradas.length) {
    lista.innerHTML = '<div class="ciudad-no-result">Sin resultados para "' + q + '"</div>';
    return;
  }

  lista.innerHTML = filtradas.map(l =>
    `<div class="ciudad-item" onclick="seleccionarCiudad('${escapar(l.nombre)}','${escapar(l.provincia)}')">
      <span class="ciudad-item-nombre">${l.nombre}</span>
      <span class="ciudad-item-prov">${l.provincia}</span>
    </div>`
  ).join('');
}

function seleccionarCiudad(nombre, provincia) {
  ciudadSeleccionada     = nombre;
  ciudadProvSeleccionada = provincia;
  document.getElementById('ciudadBtnText').textContent = `${nombre}, ${provincia}`;
  document.getElementById('ciudadBtn').classList.add('selected');
  setFieldError('f-ciudad', false);
  cerrarModalCiudad();
}

document.getElementById('ciudadModal').addEventListener('click', function(e) {
  if (e.target === this) cerrarModalCiudad();
});

function escapar(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
function goStep2() {
  let ok = true;
  if (!selectedRace)  { document.getElementById('raceError').style.display  = 'block'; ok = false; }
  if (!selectedShirt) { document.getElementById('shirtError').style.display = 'block'; ok = false; }
  if (!ok) return;
  document.getElementById('talleWrap').style.display = selectedShirt === 'con' ? 'block' : 'none';
  showStep(2);
}

function goStep3() {
  const nombre          = document.getElementById('nombre').value.trim();
  const apellido        = document.getElementById('apellido').value.trim();
  const sexo            = document.getElementById('sexo').value;
  const dni             = document.getElementById('dni').value.trim();
  const edad            = parseInt(document.getElementById('edad').value);
  const fechaNacimiento = getFechaNacimiento();
  const codarea         = document.getElementById('codarea').value.trim();
  const telefono        = document.getElementById('telefono').value.trim();
  const email           = document.getElementById('email').value.trim();
  const email2          = document.getElementById('email2').value.trim();
  const domicilio       = document.getElementById('domicilio').value.trim();
  const talle           = selectedShirt === 'con' ? document.getElementById('talle').value : 'N/A';

  const nombreOk    = nombre.length >= 2;
  const apellidoOk  = apellido.length >= 2;
  const sexoOk      = !!sexo;
  const dniOk       = /^\d{7,8}$/.test(dni);
  const ageOk       = !isNaN(edad) && edad >= 10 && edad <= 99;
  const fechaNacOk  = !!fechaNacimiento;
  const codarOk     = /^\d{2,5}$/.test(codarea);
  const telOk       = /^\d{6,12}$/.test(telefono.replace(/\s/g, ''));
  const emailOk     = email.includes('@') && email.includes('.');
  const email2Ok    = email === email2;
  const ciudadOk    = !!ciudadSeleccionada;
  const domicOk     = domicilio.length >= 4;
  const talleOk     = selectedShirt === 'sin' || !!talle;

  setFieldError('f-nombre',          !nombreOk);
  setFieldError('f-apellido',        !apellidoOk);
  setFieldError('f-sexo',            !sexoOk);
  setFieldError('f-dni',             !dniOk);
  setFieldError('f-edad',            !ageOk);
  setFieldError('f-fechaNacimiento', !fechaNacOk);
  setFieldError('f-codarea',         !codarOk);
  setFieldError('f-telefono',        !telOk);
  setFieldError('f-email',           !emailOk);
  setFieldError('f-email2',          !email2Ok);
  setFieldError('f-ciudad',          !ciudadOk);
  setFieldError('f-domicilio',       !domicOk);
  if (selectedShirt === 'con') setFieldError('f-talle', !talleOk);

  if (!nombreOk || !apellidoOk || !sexoOk || !dniOk || !ageOk || !fechaNacOk ||
      !codarOk || !telOk || !emailOk || !email2Ok || !ciudadOk || !domicOk || !talleOk) return;

  const raceName = selectedRace === '4k' ? '4K Participativa' : '10K Competitiva';
  const price    = PRICES[selectedRace][selectedShirt];
  const priceStr = `$${price.toLocaleString('es-AR')} ARS`;

  document.getElementById('sumRace').textContent       = raceName;
  document.getElementById('sumShirt').textContent      = selectedShirt === 'con' ? 'Con remera' : 'Sin remera';
  document.getElementById('sumName').textContent       = `${nombre} ${apellido}`;
  document.getElementById('sumDni').textContent        = formatDni(dni);
  document.getElementById('sumTotal').textContent      = priceStr;
  document.getElementById('transferTotal').textContent = priceStr;

  showStep(3);
}

function goBack(toStep) { showStep(toStep); }

/* ══════════════════════════════════════
   VOUCHER UPLOAD
══════════════════════════════════════ */
function handleVoucherUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  voucherFile = file;
  document.getElementById('voucherError').style.display = 'none';

  const uploadArea    = document.getElementById('uploadArea');
  const uploadIdle    = document.getElementById('uploadIdle');
  const uploadPreview = document.getElementById('uploadPreview');
  const previewImg    = document.getElementById('previewImg');
  const previewFname  = document.getElementById('previewFilename');

  uploadArea.classList.add('has-file');
  uploadIdle.style.display    = 'none';
  uploadPreview.style.display = 'block';
  previewFname.textContent    = file.name;

  if (file.type === 'application/pdf') {
    uploadPreview.innerHTML = `
      <div class="upload-pdf-placeholder">
        <div class="pdf-icon">📄</div>
        <div class="pdf-name">${file.name}</div>
      </div>
      <div class="preview-overlay">
        <span class="preview-filename">${file.name}</span>
        <button class="preview-change" onclick="changeVoucher(event)">Cambiar</button>
      </div>`;
  } else {
    const reader = new FileReader();
    reader.onload = e => { previewImg.src = e.target.result; };
    reader.readAsDataURL(file);
  }
}

function changeVoucher(e) {
  e.stopPropagation();
  voucherFile = null;
  const uploadArea    = document.getElementById('uploadArea');
  const uploadIdle    = document.getElementById('uploadIdle');
  const uploadPreview = document.getElementById('uploadPreview');
  uploadArea.classList.remove('has-file');
  uploadIdle.style.display    = 'flex';
  uploadPreview.style.display = 'none';
  uploadPreview.innerHTML = `
    <img id="previewImg" src="" alt="Comprobante">
    <div class="preview-overlay">
      <span class="preview-filename" id="previewFilename"></span>
      <button class="preview-change" onclick="changeVoucher(event)">Cambiar</button>
    </div>`;
  document.getElementById('voucherInput').value = '';
}

/* ══════════════════════════════════════
   SUBMIT
══════════════════════════════════════ */
async function processPayment() {
  if (!termsAccepted || !firmaDataUrl) {
    document.getElementById('termsError').style.display = 'block';
    const tr = document.getElementById('termsRow');
    tr.style.borderColor = '#ff6b6b';
    setTimeout(() => tr.style.borderColor = '', 1500);
    tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!voucherFile) {
    document.getElementById('voucherError').style.display = 'block';
    document.getElementById('uploadArea').style.borderColor = '#ff6b6b';
    setTimeout(() => document.getElementById('uploadArea').style.borderColor = '', 2000);
    return;
  }

  const btn = document.getElementById('payBtn');
  btn.textContent = 'Enviando...';
  btn.classList.add('loading');
  btn.disabled = true;

  const formData = new FormData();
  formData.append('comprobante',     voucherFile);
  formData.append('carrera',         selectedRace);
  formData.append('remera',          selectedShirt);
  formData.append('nombre',          document.getElementById('nombre').value.trim());
  formData.append('apellido',        document.getElementById('apellido').value.trim());
  formData.append('sexo',            document.getElementById('sexo').value);
  formData.append('edad',            document.getElementById('edad').value);
  formData.append('dni',             document.getElementById('dni').value.trim());
  formData.append('fechaNacimiento', getFechaNacimiento());
  const codpais = document.getElementById('codpais').value.trim() || '54';
  formData.append('codpais', codpais);
  formData.append('codarea',         document.getElementById('codarea').value.trim());
  formData.append('telefono',        document.getElementById('telefono').value.trim());
  formData.append('email',           document.getElementById('email').value.trim());
  formData.append('ciudad',          ciudadSeleccionada);
  formData.append('provincia',       ciudadProvSeleccionada);
  formData.append('domicilio',       document.getElementById('domicilio').value.trim());
  if (selectedShirt === 'con') formData.append('talle', document.getElementById('talle').value);
  formData.append('firmaBase64', firmaDataUrl);

  try {
    const res  = await fetch(`${API_URL}/inscripciones`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al enviar la inscripción.');
    showSuccess();
  } catch (err) {
    btn.textContent = 'Enviar inscripción ✓';
    btn.classList.remove('loading');
    btn.disabled = false;
    alert('❌ Error: ' + err.message);
  }
}

function showSuccess() {
  document.getElementById('step3').style.display    = 'none';
  document.getElementById('stepsBar').style.display = 'none';
  const success = document.getElementById('stepSuccess');
  success.style.display   = 'block';
  success.style.animation = 'fadeUp .4s ease';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════
   TERMS + FIRMA DIGITAL
══════════════════════════════════════ */
let firmaDataUrl = null; // base64 de la firma

// ── Canvas setup ──
let firmaCanvas, firmaCtx, dibujando = false, firmaVacia = true;

function initFirmaCanvas() {
  firmaCanvas = document.getElementById('firmaCanvas');
  firmaCtx    = firmaCanvas.getContext('2d');

  // Tamaño real del canvas = tamaño visual del contenedor
  const wrap = document.getElementById('firmaCanvasWrap');
  firmaCanvas.width  = wrap.clientWidth  || 320;
  firmaCanvas.height = wrap.clientHeight || 160;

  firmaCtx.strokeStyle = '#3ddc6b';
  firmaCtx.lineWidth   = 2.5;
  firmaCtx.lineCap     = 'round';
  firmaCtx.lineJoin    = 'round';

  // Eventos mouse
  firmaCanvas.addEventListener('mousedown',  startDraw);
  firmaCanvas.addEventListener('mousemove',  draw);
  firmaCanvas.addEventListener('mouseup',    endDraw);
  firmaCanvas.addEventListener('mouseleave', endDraw);

  // Eventos touch
  firmaCanvas.addEventListener('touchstart',  e => { e.preventDefault(); startDraw(e.touches[0]); }, { passive: false });
  firmaCanvas.addEventListener('touchmove',   e => { e.preventDefault(); draw(e.touches[0]); },      { passive: false });
  firmaCanvas.addEventListener('touchend',    endDraw);
}

function getPos(e) {
  const rect = firmaCanvas.getBoundingClientRect();
  const scaleX = firmaCanvas.width  / rect.width;
  const scaleY = firmaCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY
  };
}

function startDraw(e) {
  dibujando = true;
  const p = getPos(e);
  firmaCtx.beginPath();
  firmaCtx.moveTo(p.x, p.y);
  document.getElementById('firmaPlaceholder').style.display = 'none';
  document.getElementById('firmaError').style.display = 'none';
}

function draw(e) {
  if (!dibujando) return;
  firmaVacia = false;
  const p = getPos(e);
  firmaCtx.lineTo(p.x, p.y);
  firmaCtx.stroke();
}

function endDraw() { dibujando = false; }

function limpiarFirma() {
  firmaCtx.clearRect(0, 0, firmaCanvas.width, firmaCanvas.height);
  firmaVacia = true;
  firmaDataUrl = null;
  document.getElementById('firmaPlaceholder').style.display = 'flex';
}

// ── Abrir / cerrar modal ──
function openTermsModal(e) {
  e.stopPropagation();
  document.getElementById('termsModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Pequeño delay para que el modal esté visible antes de medir el canvas
  setTimeout(() => {
    if (!firmaCanvas) initFirmaCanvas();
    else {
      // Re-ajustar tamaño si cambió
      const wrap = document.getElementById('firmaCanvasWrap');
      firmaCanvas.width  = wrap.clientWidth  || 320;
      firmaCanvas.height = wrap.clientHeight || 160;
    }
    // Scroll al fondo del modal para que vean la firma
  }, 120);
}

function closeTermsModal() {
  document.getElementById('termsModal').classList.remove('open');
  document.body.style.overflow = '';
}

function confirmarTerms() {
  if (firmaVacia) {
    // Hacer scroll a la firma y mostrar error
    document.getElementById('firmaError').style.display = 'block';
    document.getElementById('firmaSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  // Guardar la firma como base64
  firmaDataUrl = firmaCanvas.toDataURL('image/png');
  termsAccepted = true;
  document.getElementById('termsCheck').classList.add('checked');
  document.getElementById('termsRow').classList.add('signed');
  document.getElementById('termsError').style.display = 'none';
  closeTermsModal();
}

// Botón "ir a la firma" fijo — scroll dentro del modal
function irAFirma() {
  document.getElementById('firmaSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ══════════════════════════════════════
   STEPS / HELPERS
══════════════════════════════════════ */

function showStep(n) {
  [1, 2, 3].forEach(i => { const el = document.getElementById('step' + i); if (el) el.style.display = 'none'; });
  document.getElementById('stepSuccess').style.display = 'none';
  const target = document.getElementById('step' + n);
  target.style.animation = 'none';
  target.style.display   = 'block';
  requestAnimationFrame(() => { target.style.animation = 'fadeUp .4s ease'; });
  updateStepBar(n);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepBar(current) {
  for (let i = 1; i <= 3; i++) {
    const circle = document.getElementById('sc' + i);
    circle.className = 'step-circle';
    if (i < current)       { circle.classList.add('done');   circle.textContent = '✓'; }
    else if (i === current){ circle.classList.add('active'); circle.textContent = i; }
    else                   { circle.textContent = i; }
  }
  for (let i = 1; i <= 2; i++) document.getElementById('sl' + i).classList.toggle('done', i < current);
}

function setFieldError(fieldId, hasError) {
  const el = document.getElementById(fieldId);
  if (el) el.classList.toggle('error', hasError);
}

function formatDni(dni) {
  const clean = dni.replace(/\D/g, '');
  if (clean.length === 8) return clean.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
  if (clean.length === 7) return clean.replace(/(\d{1})(\d{3})(\d{3})/, '$1.$2.$3');
  return clean;
}

document.getElementById('dni').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').substring(0, 8); });
document.getElementById('codarea').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').substring(0, 5); });
document.getElementById('telefono').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').substring(0, 12); });
document.getElementById('codpais').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '').substring(0, 3);
});
// Cerrar modal al tocar el overlay (fuera del modal)
document.getElementById('termsModal').addEventListener('click', function(e) {
  if (e.target === this) closeTermsModal();
});

/* ══════════════════════════════════════
   COPIAR AL PORTAPAPELES
══════════════════════════════════════ */
function copiarTexto(btn, texto) {
  navigator.clipboard.writeText(texto).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> COPIADO`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 2000);
  });
}