const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PROMO  = require('./promo.config');

/* ─────────────────────────────────────────
   HELPERS — cupo y claim atómico
───────────────────────────────────────── */

// Candado global para serializar los claims (evita que dos requests
// simultáneos se lleven el mismo cupo). Es un advisory lock de Postgres
// a nivel transacción: se libera solo al terminar la transacción.
const PROMO_LOCK_KEY = 421100;

// Cuentan como cupo ocupado: reservas 'usada' (inscripción enviada) y
// reservas 'activa' sin vencer. Las vencidas/liberadas no cuentan.
function whereCupoOcupado() {
  return {
    OR: [
      { estado: 'usada' },
      { estado: 'activa', expiresAt: { gt: new Date() } },
    ],
  };
}

async function contarCupoOcupado(tx) {
  return tx.promoReserva.count({ where: whereCupoOcupado() });
}

// Intenta reservar un cupo de forma atómica. Si `tokenExistente` tiene una
// reserva vigente, la devuelve sin consumir cupo extra (ej: el usuario volvió
// atrás y entró de nuevo al paso de pago). Devuelve la reserva o null si no hay cupo.
async function reservarCupo(tokenExistente) {
  return prisma.$transaction(async (tx) => {
    // (los timeouts generosos de abajo permiten que una ráfaga de claims
    //  encolados por el lock no muera por el default de 5s de Prisma)
    // ::text — pg_advisory_xact_lock devuelve void y Prisma no sabe deserializarlo
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${PROMO_LOCK_KEY})::text`;

    // ¿Ya tiene una reserva vigente? La reutilizamos.
    if (tokenExistente) {
      const previa = await tx.promoReserva.findUnique({ where: { token: tokenExistente } });
      if (previa && previa.estado === 'activa' && previa.expiresAt > new Date()) {
        return previa;
      }
    }

    const ocupados = await contarCupoOcupado(tx);
    if (ocupados >= PROMO.cupoMaximo) return null;

    return tx.promoReserva.create({
      data: {
        token:     crypto.randomUUID(),
        estado:    'activa',
        expiresAt: new Date(Date.now() + PROMO.ttlMinutos * 60 * 1000),
      },
    });
  }, { maxWait: 15000, timeout: 30000 });
}

/* ─────────────────────────────────────────
   GET /promo/estado — PÚBLICO
   Info para el aviso de la landing (solo lectura, puede estar
   levemente desactualizada — la verdad se decide al reservar).
───────────────────────────────────────── */
router.get('/estado', async (req, res) => {
  try {
    if (!PROMO.activo) return res.json({ activo: false });
    const ocupados = await prisma.promoReserva.count({ where: whereCupoOcupado() });
    res.json({
      activo:     true,
      porcentaje: PROMO.porcentaje,
      cupoMaximo: PROMO.cupoMaximo,
      restantes:  Math.max(0, PROMO.cupoMaximo - ocupados),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   POST /promo/reservar — PÚBLICO
   Reserva un cupo al llegar al paso de pago. Reutiliza la reserva
   vigente si el cliente ya tenía una (body.token).
───────────────────────────────────────── */
router.post('/reservar', async (req, res) => {
  try {
    if (!PROMO.activo) return res.json({ disponible: false });

    const reserva = await reservarCupo(req.body && req.body.token);
    if (!reserva) return res.json({ disponible: false });

    res.json({
      disponible: true,
      token:      reserva.token,
      expiresAt:  reserva.expiresAt,
      porcentaje: PROMO.porcentaje,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
module.exports.reservarCupo = reservarCupo;
module.exports.PROMO_LOCK_KEY = PROMO_LOCK_KEY;
module.exports.whereCupoOcupado = whereCupoOcupado;
