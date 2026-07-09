/* ════════════════════════════════════════════════════════════
   CONFIGURACIÓN DEL CLUB / EVENTO
   ------------------------------------------------------------
   ⚠️  DATOS MOCK (de ejemplo). Editá los valores de abajo con
       la información real de Huracán de Chivilcoy.
       No hace falta tocar el resto del código: todo el cliente
       lee desde acá (window.CLUB_CONFIG).
════════════════════════════════════════════════════════════ */
window.CLUB_CONFIG = {
  club: {
    nombre:      'Huracán de Chivilcoy',              // se muestra en el hero, footer, etc.
    nombreLegal: 'Club Atlético Huracán de Chivilcoy', // titular de la cuenta / términos
    slogan:      'Un club hecho por y para vos',
    edicion:     '1ª Edición',
  },

  evento: {
    titulo:     'Running Trail',
    fechaTexto: '17 de Octubre',
    fechaCorta: '17 de octubre',
    hora:       'A confirmar',
    anio:       2026,
    lugar:      'Club Atlético Huracán, Chivilcoy',
    avisoFecha: '',
  },

  // Info de retiro de kit (se muestra en la pantalla de éxito)
  kit: {
    chivilcoy: 'Retirá tu kit el viernes 16 de octubre de 14:00 a 19:00 hs',
    otras:     'Retirá tu kit el mismo día de la carrera al presentarte',
  },

  // Datos para la transferencia — ⚠️ MOCK, reemplazar por los reales
  transferencia: {
    titular: 'Club Atlético Huracán de Chivilcoy',
    cbu:     '0000000000000000000000',   // MOCK (22 dígitos)
    alias:   'huracan.chivilcoy',        // MOCK
  },

  contacto: {
    whatsapp: '5492346000000',           // MOCK — formato internacional sin '+' ni espacios
  },

  /* ── Carreras ──
     La CLAVE ('4k' / '10k' / 'caminata') es el identificador interno que se
     envía al backend. NO la cambies todavía (el admin/backend la usan).
     Editá libremente distancia, tipo, descripción y precios.               */
  carreras: {
    '4k': {
      dist:   '15K',
      tipo:   'Competitiva',
      desc:   'Con cronometraje oficial',
      nombre: '15K Competitiva',   // se muestra en el resumen de pago
    },
    '10k': {
      dist:   '7K',
      tipo:   'Participativa',
      desc:   'Con cronometraje oficial',
      nombre: '7K Participativa',
    },
    'caminata': {
      dist:   '7K',
      tipo:   'Caminata',
      desc:   'Sin cronometraje · Solidaria',
      nombre: '7K Caminata',
    },
  },

  // Precios por carrera (ARS). con = con remera, sin = sin remera
  precios: {
    '4k':       { con: 45000, sin: 40000 },  // 15K
    '10k':      { con: 35000, sin: 30000 },  // 7K
    'caminata': { sin: 0 },                  // 7K caminata (gratis, sin remera)
  },
};
