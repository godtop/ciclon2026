require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const multer  = require('multer');

// Sin JWT_SECRET el login firma tokens con `undefined` — mejor cortar acá
if (!process.env.JWT_SECRET) {
  console.error('❌ Falta JWT_SECRET en el .env');
  process.exit(1);
}

const inscripcionesRouter = require('./inscripciones.router');
const codigosRouter       = require('./codigos.router');
const authRouter          = require('./auth.router');
const promoRouter         = require('./promo.router');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH'],
}));
app.use(express.json());

// ── Panel admin — sirve la carpeta /admin como estática ──
// Accedé en: http://localhost:3000/admin
app.use(express.static(path.join(__dirname, '../public')));

// Sirve admin
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// ── Rutas ──
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRouter);
app.use('/inscripciones', inscripcionesRouter);
app.use('/codigos', codigosRouter);
app.use('/promo', promoRouter);

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error(err.message);

  // Errores de subida de archivo → 400 con mensaje claro (no 500)
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo supera el máximo de 10 MB.'
      : 'Error al subir el archivo.';
    return res.status(400).json({ error: msg });
  }
  if (err.message && err.message.startsWith('Tipo de archivo no permitido')) {
    return res.status(400).json({ error: err.message });
  }

  // No filtrar detalles internos al cliente
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`🏃  Servidor: http://localhost:${PORT}`);
  console.log(`🔐  Admin:    http://localhost:${PORT}/admin`);
});