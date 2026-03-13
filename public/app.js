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

    // Scroll al botón continuar luego de que aparezca el selector de remera
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

    // Scroll al botón continuar luego de seleccionar remera
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

// Carga única al iniciar la página
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
    // Mostrar primeras ciudades apenas carga
    renderCiudades('');
  } catch {
    document.getElementById('ciudadLoading').textContent = '⚠️ Error al cargar. Intentá de nuevo.';
  }
})();

function abrirModalCiudad() {
  document.getElementById('ciudadModal').classList.add('open');
  document.getElementById('ciudadSearchInput').value = '';
  if (ciudadesListo) renderCiudades('');
  // Pequeño delay para que el modal esté visible antes del focus (mejor en móvil)
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

// Cerrar modal al clickear el fondo oscuro
document.getElementById('ciudadModal').addEventListener('click', function(e) {
  if (e.target === this) cerrarModalCiudad();
});

// Helper para evitar problemas con comillas en nombres de localidades
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
  const fechaNacimiento = document.getElementById('fechaNacimiento').value;
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
  const ciudadOk    = !!ciudadSeleccionada; // Solo válido si se seleccionó del modal
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
  if (!termsAccepted) {
    const tr = document.querySelector('.terms-row');
    tr.style.borderColor = '#ff6b6b';
    setTimeout(() => tr.style.borderColor = '', 1500);
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
  formData.append('fechaNacimiento', document.getElementById('fechaNacimiento').value);
  formData.append('codarea',         document.getElementById('codarea').value.trim());
  formData.append('telefono',        document.getElementById('telefono').value.trim());
  formData.append('email',           document.getElementById('email').value.trim());
  formData.append('ciudad',          ciudadSeleccionada);
  formData.append('provincia',       ciudadProvSeleccionada);
  formData.append('domicilio',       document.getElementById('domicilio').value.trim());
  if (selectedShirt === 'con') formData.append('talle', document.getElementById('talle').value);

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
   TERMS / STEPS / HELPERS
══════════════════════════════════════ */
function toggleTerms() {
  termsAccepted = !termsAccepted;
  document.getElementById('termsCheck').classList.toggle('checked', termsAccepted);
}

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

function openTerms(e) { e.preventDefault(); e.stopPropagation(); document.getElementById('termsModal').classList.add('open'); }
function closeTerms() { document.getElementById('termsModal').classList.remove('open'); }
document.getElementById('termsModal').addEventListener('click', function(e) { if (e.target === this) closeTerms(); });