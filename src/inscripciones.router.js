const express    = require('express');
const router     = express.Router();
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('./cloudinary');
const upload     = require('./upload');
const requireAuth = require('./auth.middleware');

const prisma = new PrismaClient();

const PRICES = {
  '4k':  { con: 23000, sin: 15000 },
  '10k': { con: 30000, sin: 22000 },
};

/* ─────────────────────────────────────────
   POST /inscripciones — PÚBLICO
───────────────────────────────────────── */
router.post('/', upload.single('comprobante'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'El comprobante es obligatorio.' });
    }

    const {
      carrera, remera, talle,
      nombre, apellido, sexo, edad, dni, fechaNacimiento,
      codarea, telefono, email, ciudad, domicilio,
    } = req.body;

    if (!carrera || !remera || !nombre || !apellido || !sexo || !edad || !dni ||
        !codarea || !telefono || !email || !ciudad || !domicilio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    if (!PRICES[carrera] || !PRICES[carrera][remera]) {
      return res.status(400).json({ error: 'Carrera o remera inválida.' });
    }

    const monto = PRICES[carrera][remera];

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'maraton-ciclon/comprobantes', resource_type: 'auto' },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });

    const inscripcion = await prisma.inscripcion.create({
      data: {
        carrera, remera,
        talle:          remera === 'con' ? (talle || null) : null,
        monto,
        nombre, apellido, sexo,
        edad:           parseInt(edad),
        dni,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento + 'T00:00:00') : null,
        codarea, telefono, email, ciudad, domicilio,
        comprobanteUrl:      uploadResult.secure_url,
        comprobantePublicId: uploadResult.public_id,
        estado: 'pendiente',
      },
    });

    res.status(201).json({ ok: true, id: inscripcion.id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   GET /inscripciones — ADMIN
───────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { estado } = req.query;
    const where = estado ? { estado } : {};
    const inscripciones = await prisma.inscripcion.findMany({
      where, orderBy: { createdAt: 'desc' },
    });
    res.json(inscripciones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   GET /inscripciones/:id — ADMIN
───────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!inscripcion) return res.status(404).json({ error: 'Inscripción no encontrada.' });
    res.json(inscripcion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   PATCH /inscripciones/:id/confirmar — ADMIN
───────────────────────────────────────── */
router.patch('/:id/confirmar', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existe = await prisma.inscripcion.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Inscripción no encontrada.' });
    const actualizada = await prisma.inscripcion.update({
      where: { id }, data: { estado: 'confirmado' },
    });
    res.json({ ok: true, inscripcion: actualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   PATCH /inscripciones/:id/rechazar — ADMIN
───────────────────────────────────────── */
router.patch('/:id/rechazar', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existe = await prisma.inscripcion.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Inscripción no encontrada.' });
    const actualizada = await prisma.inscripcion.update({
      where: { id }, data: { estado: 'rechazado' },
    });
    res.json({ ok: true, inscripcion: actualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;