const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('./auth.middleware');

const prisma = new PrismaClient();

// Cortes y talles (mismo orden que el formulario)
const CORTES = ['mujer', 'hombre'];
const TALLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Candado para serializar el consumo de stock (advisory lock de Postgres a
// nivel transacción, igual que la promo "primeros 100" pero con otra clave).
const REMERA_LOCK_KEY = 421200;

// Cuentan como pedidas: inscripciones con remera que no fueron rechazadas
// (las pendientes también: ya mandaron el comprobante y la remera les queda reservada)
const wherePedidas = (corte, talle) => ({
  remera: 'con', estado: { not: 'rechazado' },
  ...(corte ? { corte } : {}), ...(talle ? { talle } : {}),
});

// Resumen: [{ corte, talle, stock, pedidas, disponibles }]
// disponibles = stock − pedidas (puede ser negativo: hay que comprar más)
async function resumen(db = prisma) {
  const [stocks, grupos] = await Promise.all([
    db.stockRemera.findMany(),
    db.inscripcion.groupBy({
      by: ['corte', 'talle'],
      where: wherePedidas(),
      _count: { _all: true },
    }),
  ]);
  const filas = [];
  for (const corte of CORTES) {
    for (const talle of TALLES) {
      const stock   = (stocks.find(s => s.corte === corte && s.talle === talle) || {}).stock || 0;
      const grupo   = grupos.find(g => g.corte === corte && g.talle === talle);
      const pedidas = grupo ? grupo._count._all : 0;
      filas.push({ corte, talle, stock, pedidas, disponibles: stock - pedidas });
    }
  }
  return filas;
}

// Dentro de la transacción de inscripción: bloquea y verifica que quede
// stock de ese corte y talle. Como las pedidas se cuentan desde Inscripcion,
// crear la inscripción (en la misma transacción) ya descuenta la unidad.
async function verificarStockTalle(tx, corte, talle) {
  // ::text — pg_advisory_xact_lock devuelve void y Prisma no sabe deserializarlo
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(${REMERA_LOCK_KEY})::text`;
  const fila    = await tx.stockRemera.findUnique({ where: { corte_talle: { corte, talle } } });
  const pedidas = await tx.inscripcion.count({ where: wherePedidas(corte, talle) });
  return !!fila && pedidas < fila.stock;
}

/* ─────────────────────────────────────────
   GET /remeras/stock — PÚBLICO
   Solo dice qué talles de cada corte están disponibles (sin cantidades).
───────────────────────────────────────── */
router.get('/stock', async (req, res) => {
  try {
    const r = await resumen();
    res.json(r.map(t => ({ corte: t.corte, talle: t.talle, disponible: t.disponibles > 0 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   GET /remeras — ADMIN
───────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    res.json(await resumen());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   PATCH /remeras/:corte/:talle — ADMIN
   body: { delta: +n | -n }  → suma/resta al stock comprado (mínimo 0).
───────────────────────────────────────── */
router.patch('/:corte/:talle', requireAuth, async (req, res) => {
  try {
    const { corte, talle } = req.params;
    const delta = parseInt(req.body && req.body.delta);
    if (!CORTES.includes(corte) || !TALLES.includes(talle)) {
      return res.status(400).json({ error: 'Corte o talle inválido.' });
    }
    if (!Number.isInteger(delta) || delta === 0) return res.status(400).json({ error: 'Cantidad inválida.' });

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${REMERA_LOCK_KEY})::text`;
      const fila  = await tx.stockRemera.findUnique({ where: { corte_talle: { corte, talle } } });
      const nuevo = Math.max(0, ((fila && fila.stock) || 0) + delta);
      await tx.stockRemera.upsert({
        where:  { corte_talle: { corte, talle } },
        update: { stock: nuevo },
        create: { corte, talle, stock: nuevo },
      });
      return resumen(tx);
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
module.exports.CORTES = CORTES;
module.exports.TALLES = TALLES;
module.exports.verificarStockTalle = verificarStockTalle;
