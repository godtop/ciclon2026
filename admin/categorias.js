const FECHA_CARRERA = new Date(2026, 5, 14);

const CATEGORIAS = [
  { num: 1,  label: 'Juveniles', min: 0,  max: 19  },
  { num: 2,  label: '20 – 24',   min: 20, max: 24  },
  { num: 3,  label: '25 – 29',   min: 25, max: 29  },
  { num: 4,  label: '30 – 34',   min: 30, max: 34  },
  { num: 5,  label: '35 – 39',   min: 35, max: 39  },
  { num: 6,  label: '40 – 44',   min: 40, max: 44  },
  { num: 7,  label: '45 – 49',   min: 45, max: 49  },
  { num: 8,  label: '50 – 54',   min: 50, max: 54  },
  { num: 9,  label: '55 – 59',   min: 55, max: 59  },
  { num: 10, label: '60 – 64',   min: 60, max: 64  },
  { num: 11, label: '65 – 69',   min: 65, max: 69  },
  { num: 12, label: '70 – 74',   min: 70, max: 74  },
  { num: 13, label: '75 – 79',   min: 75, max: 79  },
  { num: 14, label: '80 – 84',   min: 80, max: 84  },
  { num: 15, label: '85+',       min: 85, max: 999 },
];

let todosLosInscriptos = [];
let filtroCarrera      = 'todas';
let separarSexo        = false;
let catSeleccionada    = null; // null = todas

/* ══════════════════════════════
   INIT
══════════════════════════════ */
window.addEventListener('load', () => {
  const raw = sessionStorage.getItem('ciclon_inscripciones');
  if (!raw) {
    mostrarNoData();
    return;
  }
  todosLosInscriptos = JSON.parse(raw);
  render();
});

function mostrarNoData() {
  document.getElementById('mainContent').innerHTML = `
    <div class="no-data">
      <div class="icon">📭</div>
      <div class="title">Sin datos cargados</div>
      <div class="sub">Primero ingresá al panel principal para cargar las inscripciones.</div>
      <a class="link" href="admin.html">← Ir al panel</a>
    </div>`;
}

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function edadEnCarrera(fechaNac) {
  if (!fechaNac) return null;
  const nac  = new Date(fechaNac);
  let edad   = FECHA_CARRERA.getFullYear() - nac.getFullYear();
  const yaCumplio =
    nac.getMonth() < FECHA_CARRERA.getMonth() ||
    (nac.getMonth() === FECHA_CARRERA.getMonth() && nac.getDate() <= FECHA_CARRERA.getDate());
  if (!yaCumplio) edad--;
  return edad;
}

function categoriaDeEdad(edad) {
  if (edad === null) return null;
  return CATEGORIAS.find(c => edad >= c.min && edad <= c.max) || null;
}

function fmtDni(dni) {
  const c = String(dni).replace(/\D/g, '');
  if (c.length === 8) return c.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
  if (c.length === 7) return c.replace(/(\d{1})(\d{3})(\d{3})/, '$1.$2.$3');
  return c;
}

function fmtSexo(s) {
  return { M: 'Masculino', F: 'Femenino', X: 'No binario', NI: 'N/D' }[s] || s;
}

function sexoLabel(s) {
  return { M: 'Masculino', F: 'Femenino', X: 'No binario / N/D', NI: 'No binario / N/D' }[s] || s;
}

function sexoClass(s) {
  return s === 'M' ? 'M' : s === 'F' ? 'F' : 'X';
}

/* ══════════════════════════════
   FILTROS (llamados desde HTML)
══════════════════════════════ */
function setCarrera(btn, valor) {
  filtroCarrera = valor;
  catSeleccionada = null;
  document.querySelectorAll('.filter-carrera').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function toggleSexo(btn) {
  separarSexo = !separarSexo;
  btn.classList.toggle('active', separarSexo);
  render();
}

function seleccionarCat(num) {
  const cat = CATEGORIAS.find(c => c.num === num);
  const items = inscriptosVisibles();
  const enCat = items.filter(i => {
    const e = edadEnCarrera(i.fechaNacimiento);
    const c = categoriaDeEdad(e);
    return c && c.num === num;
  });
  if (!enCat.length) return; // categoría vacía, no hace nada

  catSeleccionada = catSeleccionada === num ? null : num;
  render();
}

/* ══════════════════════════════
   DATOS FILTRADOS
══════════════════════════════ */
function inscriptosVisibles() {
  return todosLosInscriptos.filter(i => {
    if (filtroCarrera === 'todas') return true;
    return i.carrera === filtroCarrera;
  });
}

/* ══════════════════════════════
   RENDER PRINCIPAL
══════════════════════════════ */
function render() {
  const items = inscriptosVisibles();

  // Enriquecer con edad y categoría
  const enriquecidos = items.map(i => {
    const edad = edadEnCarrera(i.fechaNacimiento);
    const cat  = categoriaDeEdad(edad);
    return { ...i, edadCarrera: edad, categoria: cat };
  });

  // Filtrar por categoría seleccionada
  const filtrados = catSeleccionada !== null
    ? enriquecidos.filter(i => i.categoria && i.categoria.num === catSeleccionada)
    : enriquecidos;

  // Contador
  document.getElementById('counter').textContent =
    `${filtrados.length} corredor${filtrados.length !== 1 ? 'es' : ''}`;

  renderResumen(enriquecidos);
  renderTabla(filtrados);
}

/* ══════════════════════════════
   RESUMEN — chips por categoría
══════════════════════════════ */
function renderResumen(items) {
  const grid = document.getElementById('resumenGrid');

  grid.innerHTML = CATEGORIAS.map(cat => {
    const enCat = items.filter(i => i.categoria && i.categoria.num === cat.num);
    const total = enCat.length;
    const masc  = enCat.filter(i => i.sexo === 'M').length;
    const fem   = enCat.filter(i => i.sexo === 'F').length;
    const nb    = total - masc - fem;
    const activo = catSeleccionada === cat.num ? 'active' : '';
    const vacio  = total === 0 ? 'empty' : '';

    let countHTML = '';
    if (separarSexo && total > 0) {
      countHTML = `
        <div class="cat-chip-count">
          <span class="cat-chip-total">${total}</span>
          ${masc ? `<span class="cat-chip-masc">♂${masc}</span>` : ''}
          ${fem  ? `<span class="cat-chip-fem">♀${fem}</span>`   : ''}
          ${nb   ? `<span class="cat-chip-nb">⚧${nb}</span>`     : ''}
        </div>`;
    } else {
      countHTML = `
        <div class="cat-chip-count">
          <span class="cat-chip-total">${total}</span>
          <span class="cat-chip-all">corredores</span>
        </div>`;
    }

    return `
    <div class="cat-chip ${activo} ${vacio}" onclick="seleccionarCat(${cat.num})">
      <div class="cat-chip-num">Cat. ${cat.num}</div>
      <div class="cat-chip-rango">${cat.label}</div>
      ${countHTML}
    </div>`;
  }).join('');
}

/* ══════════════════════════════
   TABLA / CARDS
══════════════════════════════ */
function renderTabla(items) {
  const section = document.getElementById('tablaSection');

  // Título de la sección
  const tituloEl = document.getElementById('tablaTitulo');
  if (catSeleccionada !== null) {
    const cat = CATEGORIAS.find(c => c.num === catSeleccionada);
    tituloEl.innerHTML = `Categoría ${cat.num} · ${cat.label} <span class="pill">${items.length}</span>`;
  } else {
    tituloEl.innerHTML = `Todos los corredores <span class="pill">${items.length}</span>`;
  }

  if (!items.length) {
    document.getElementById('tablaDesktop').innerHTML = '<div class="state-msg">Sin corredores en esta selección.</div>';
    document.getElementById('tablaMobile').innerHTML  = '<div class="state-msg">Sin corredores en esta selección.</div>';
    return;
  }

  if (separarSexo) {
    // Agrupar por sexo: M, F, otros
    const grupos = [
      { key: 'M', label: 'Masculino' },
      { key: 'F', label: 'Femenino'  },
      { key: 'X', label: 'No binario / N/D' },
    ];

    let desktopHTML = '';
    let mobileHTML  = '';

    grupos.forEach(g => {
      const grupo = items.filter(i => {
        if (g.key === 'X') return i.sexo !== 'M' && i.sexo !== 'F';
        return i.sexo === g.key;
      });
      if (!grupo.length) return;

      desktopHTML += `
        <div class="subtable-wrap">
          <div class="subtable-header">
            <div class="sexo-dot ${g.key}"></div>
            <div class="subtable-label">${g.label}</div>
            <div class="subtable-count">${grupo.length}</div>
          </div>
          <div class="table-wrap">
            <table>${tablaHead()}${tablaBody(grupo)}</table>
          </div>
        </div>`;

      mobileHTML += `
        <div class="subtable-wrap">
          <div class="subtable-header">
            <div class="sexo-dot ${g.key}"></div>
            <div class="subtable-label">${g.label}</div>
            <div class="subtable-count">${grupo.length}</div>
          </div>
          <div class="cards-list">${grupo.map(mobileCard).join('')}</div>
        </div>`;
    });

    document.getElementById('tablaDesktop').innerHTML = desktopHTML || '<div class="state-msg">Sin corredores.</div>';
    document.getElementById('tablaMobile').innerHTML  = mobileHTML  || '<div class="state-msg">Sin corredores.</div>';
  } else {
    document.getElementById('tablaDesktop').innerHTML = `
      <div class="table-wrap">
        <table>${tablaHead()}${tablaBody(items)}</table>
      </div>`;
    document.getElementById('tablaMobile').innerHTML = `
      <div class="cards-list">${items.map(mobileCard).join('')}</div>`;
  }
}

function tablaHead() {
  return `
  <thead>
    <tr>
      <th>#</th>
      <th>Nombre</th>
      <th>DNI</th>
      <th>Nacimiento</th>
      <th>Edad 14/jun</th>
      <th>Sexo</th>
      <th>Carrera</th>
      <th>Ciudad</th>
      <th>Estado</th>
    </tr>
  </thead>`;
}

function tablaBody(items) {
  const badges = { pendiente: 'badge-pendiente', confirmado: 'badge-confirmado', rechazado: 'badge-rechazado' };
  return `<tbody>` + items.map((i, idx) => `
    <tr>
      <td class="muted">${idx + 1}</td>
      <td class="td-name">${i.nombre} ${i.apellido}</td>
      <td class="muted">${fmtDni(i.dni)}</td>
      <td class="muted">${i.fechaNacimiento ? new Date(i.fechaNacimiento).toLocaleDateString('es-AR') : '—'}</td>
      <td class="td-edad">${i.edadCarrera !== null ? i.edadCarrera : '—'}</td>
      <td class="muted">${fmtSexo(i.sexo)}</td>
      <td><strong>${i.carrera.toUpperCase()}</strong></td>
      <td class="muted">${i.ciudad}</td>
      <td><span class="badge ${badges[i.estado]}">${i.estado}</span></td>
    </tr>`).join('') + `</tbody>`;
}

function mobileCard(i) {
  const initials = (i.nombre[0] + i.apellido[0]).toUpperCase();
  const badges   = { pendiente: 'badge-pendiente', confirmado: 'badge-confirmado', rechazado: 'badge-rechazado' };
  return `
  <div class="mcard">
    <div class="mcard-avatar">${initials}</div>
    <div class="mcard-info">
      <div class="mcard-name">${i.nombre} ${i.apellido}</div>
      <div class="mcard-meta">${i.carrera.toUpperCase()} · ${fmtSexo(i.sexo)} · ${i.ciudad}</div>
    </div>
    <div class="mcard-right">
      <div class="mcard-edad">${i.edadCarrera !== null ? i.edadCarrera + ' años' : '—'}</div>
      <span class="badge ${badges[i.estado]}">${i.estado}</span>
    </div>
  </div>`;
}