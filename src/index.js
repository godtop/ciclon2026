require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const inscripcionesRouter = require('./inscripciones.router');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH'],
}));
app.use(express.json());

// ── Routes ──
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/inscripciones', inscripcionesRouter);

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🏃 Servidor corriendo en http://localhost:${PORT}`);
});