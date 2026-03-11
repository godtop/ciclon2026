const express  = require('express');
const router   = express.Router();
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('./cloudinary');
const upload     = require('./upload');

const prisma = new PrismaClient();

const PRICES = {
  '4k':  { con: 4500, sin: 3500 },
  '10k': { con: 6000, sin: 5000 },
};

/* ─────────────────────────────────────────
   POST /inscripciones
   Recibe el formulario + comprobante
───────────────────────────────────────── */
router.post('/', upload.single('comprobante'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'El comprobante es obligatorio.' });
    }

    const {
      carrera, remera, talle,
      nombre, apellido, sexo, edad, dni,
      codarea, telefono, email, ciudad, domicilio,
    } = req.body;

    // Validaciones básicas
    if (!carrera || !remera || !nombre || !apellido || !sexo || !edad || !dni ||
        !codarea || !telefono || !email || !ciudad || !domicilio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    if (!PRICES[carrera] || !PRICES[carrera][remera]) {
      return res.status(400).json({ error: 'Carrera o remera inválida.' });
    }

    const monto = PRICES[carrera][remera];

    // Subir imagen a Cloudinary desde buffer en memoria
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'maraton-ciclon/comprobantes', resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // Guardar en DB
    const inscripcion = await prisma.inscripcion.create({
      data: {
        carrera,
        remera,
        talle:    remera === 'con' ? (talle || null) : null,
        monto,
        nombre,
        apellido,
        sexo,
        edad:     parseInt(edad),
        dni,
        codarea,
        telefono,
        email,
        ciudad,
        domicilio,
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
   GET /inscripciones
   Lista todos los inscriptos
   ?estado=pendiente|confirmado  (opcional)
───────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { estado } = req.query;
    const where = estado ? { estado } : {};

    const inscripciones = await prisma.inscripcion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(inscripciones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   GET /inscripciones/:id
   Detalle de un inscripto
───────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!inscripcion) {
      return res.status(404).json({ error: 'Inscripción no encontrada.' });
    }

    res.json(inscripcion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   PATCH /inscripciones/:id/confirmar
   Confirma la inscripción de un corredor
───────────────────────────────────────── */
router.patch('/:id/confirmar', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existe = await prisma.inscripcion.findUnique({ where: { id } });
    if (!existe) {
      return res.status(404).json({ error: 'Inscripción no encontrada.' });
    }

    const actualizada = await prisma.inscripcion.update({
      where: { id },
      data:  { estado: 'confirmado' },
    });

    res.json({ ok: true, inscripcion: actualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   PATCH /inscripciones/:id/rechazar
   Rechaza la inscripción (vuelve a pendiente o marca rechazado)
───────────────────────────────────────── */
router.patch('/:id/rechazar', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existe = await prisma.inscripcion.findUnique({ where: { id } });
    if (!existe) {
      return res.status(404).json({ error: 'Inscripción no encontrada.' });
    }

    const actualizada = await prisma.inscripcion.update({
      where: { id },
      data:  { estado: 'rechazado' },
    });

    res.json({ ok: true, inscripcion: actualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;