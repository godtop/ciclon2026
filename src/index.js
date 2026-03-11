require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const inscripcionesRouter = require('./inscripciones.router');
const authRouter          = require('./auth.router');

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
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/admin.html'));
});

// ── Rutas ──
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRouter);
app.use('/inscripciones', inscripcionesRouter);

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🏃  Servidor: http://localhost:${PORT}`);
  console.log(`🔐  Admin:    http://localhost:${PORT}/admin`);
});