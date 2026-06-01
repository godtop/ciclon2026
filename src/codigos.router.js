const express = require('express');
const router   = express.Router();
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('./auth.middleware');

const prisma = new PrismaClient();

const PRICES = {
  '4k':  { con: 23000, sin: 15000 },
  '10k': { con: 30000, sin: 22000 },
  'caminata': { con: 15000, sin: 0 },
};

router.post('/', requireAuth, async (req, res) => {
  try {
    const { codigo, tipo, porcentaje, montoFijo, usosMaximos } = req.body;
    if (!codigo || !tipo || !usosMaximos) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    if (!['porcentaje', 'montoFijo'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser porcentaje o montoFijo.' });
    }
    if (tipo === 'porcentaje' && (porcentaje == null || porcentaje < 1 || porcentaje > 100)) {
      return res.status(400).json({ error: 'Porcentaje debe estar entre 1 y 100.' });
    }
    if (tipo === 'montoFijo' && (montoFijo == null || montoFijo < 1)) {
      return res.status(400).json({ error: 'Monto fijo debe ser mayor a 0.' });
    }
    const existe = await prisma.codigoDescuento.findUnique({ where: { codigo } });
    if (existe) return res.status(409).json({ error: 'Ese código ya existe.' });
    const creado = await prisma.codigoDescuento.create({
      data: {
        codigo,
        tipo,
        porcentaje: tipo === 'porcentaje' ? parseInt(porcentaje) : null,
        montoFijo: tipo === 'montoFijo' ? parseInt(montoFijo) : null,
        usosMaximos: parseInt(usosMaximos),
      },
    });
    res.status(201).json({ ok: true, codigo: creado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const codigos = await prisma.codigoDescuento.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(codigos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const encontrado = await prisma.codigoDescuento.findUnique({ where: { id } });
    if (!encontrado) return res.status(404).json({ error: 'Código no encontrado.' });
    await prisma.codigoDescuento.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.post('/validar', async (req, res) => {
  try {
    const { codigo, carrera, remera } = req.body;
    if (!codigo || !carrera || !remera) {
      return res.status(400).json({ error: 'Faltan datos.' });
    }
    const codigoDB = await prisma.codigoDescuento.findUnique({ where: { codigo } });
    if (!codigoDB || !codigoDB.activo) {
      return res.status(400).json({ error: 'Código inválido o inactivo.' });
    }
    if (codigoDB.usosActuales >= codigoDB.usosMaximos) {
      return res.status(400).json({ error: 'El código ya agotó sus usos.' });
    }
    const montoOriginal = PRICES[carrera] !== undefined ? PRICES[carrera][remera] : undefined;
    if (montoOriginal === undefined) {
      return res.status(400).json({ error: 'Carrera o remera inválida.' });
    }
    let descuento = 0;
    if (codigoDB.tipo === 'porcentaje' && codigoDB.porcentaje) {
      descuento = Math.floor(montoOriginal * codigoDB.porcentaje / 100);
    } else if (codigoDB.tipo === 'montoFijo' && codigoDB.montoFijo) {
      descuento = Math.min(codigoDB.montoFijo, montoOriginal);
    }
    const montoFinal = montoOriginal - descuento;
    res.json({
      valid: true,
      codigoId: codigoDB.id,
      descuento,
      montoOriginal,
      montoFinal,
      tipo: codigoDB.tipo,
      valor: codigoDB.tipo === 'porcentaje' ? codigoDB.porcentaje : codigoDB.montoFijo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
