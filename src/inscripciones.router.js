const express    = require('express');
const crypto     = require('crypto');
const router     = express.Router();
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('./cloudinary');
const upload     = require('./upload');
const requireAuth = require('./auth.middleware');
const { Resend } = require('resend');

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const PRICES = require('./prices');
const PROMO  = require('./promo.config');
const { PROMO_LOCK_KEY, whereCupoOcupado } = require('./promo.router');

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDni(dni) {
  const c = String(dni).replace(/\D/g, '');
  if (c.length === 8) return c.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
  if (c.length === 7) return c.replace(/(\d{1})(\d{3})(\d{3})/, '$1.$2.$3');
  return c;
}

function fmtFecha(dt) {
  return new Date(dt).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtSexo(s) {
  return { M: 'Masculino', F: 'Femenino', X: 'No binario', NI: 'Prefiero no decir' }[s] || s;
}

/* ─────────────────────────────────────────
   EMAIL DE CONFIRMACIÓN
───────────────────────────────────────── */
async function enviarEmailConfirmacion(inscripcion) {
  const {
    nombre, apellido, email, carrera, remera, talle,
    monto, montoOriginal, dni, edad, sexo, fechaNacimiento,
    ciudad, domicilio, codpais, codarea, telefono, createdAt,
  } = inscripcion;

  const nombreCompleto = `${nombre} ${apellido}`;
  const remeraTexto    = remera === 'con' ? `Con remera · Talle ${talle}` : 'Sin remera';
  const fechaNacTexto  = fechaNacimiento ? fmtFecha(fechaNacimiento) : '—';
  // Claves internas de carrera — mismos labels que public/config.js
  const DIST  = { '15k': '15K', '7k': '7K', 'caminata': '7K' };
  const TIPO  = { '15k': 'Competitiva', '7k': 'Participativa', 'caminata': 'Caminata' };
  const dist  = DIST[carrera] || carrera.toUpperCase();
  const tipo  = TIPO[carrera] || '';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscripción Confirmada</title>
</head>
<body style="margin:0;padding:0;background:#eef0f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- WRAPPER -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;padding:24px 0 48px;">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:540px;">


          <!-- ══ HERO HEADER ══ -->
          <tr>
            <td style="background:#ffffff;border-radius:20px 20px 0 0;padding:36px 28px 32px;text-align:center;border:1px solid rgba(0,0,0,.10);border-bottom:none;">

              <!-- Edition tag -->
              <div style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:3px;color:#e2001a;text-transform:uppercase;border:1px solid rgba(226,0,26,.35);border-radius:20px;padding:4px 14px;margin-bottom:20px;">
                ✦ PRIMERA EDICIÓN ✦
              </div>

              <!-- Title -->
              <div style="font-size:42px;font-weight:900;color:#e2001a;letter-spacing:-1px;line-height:1;margin-bottom:4px;">
                RUNNING TRAIL
              </div>
              <div style="font-size:14px;font-weight:600;color:#191a1c;letter-spacing:3px;margin-bottom:28px;">
                HURACÁN DE CHIVILCOY
              </div>

              <!-- Confirmed badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#ff2a3a,#e2001a);border-radius:14px;padding:18px 28px;text-align:center;">
                    <div style="font-size:32px;line-height:1;margin-bottom:8px;">✅</div>
                    <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.5px;margin-bottom:4px;">
                      INSCRIPCIÓN CONFIRMADA
                    </div>
                    <div style="font-size:13px;color:rgba(255,255,255,0.85);font-weight:500;">
                      Pago verificado · Ya sos parte de la carrera
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>


          <!-- ══ GREETING ══ -->
          <tr>
            <td style="background:#ffffff;padding:0 28px 28px;border-left:1px solid rgba(0,0,0,.10);border-right:1px solid rgba(0,0,0,.10);">
              <p style="margin:20px 0 0;font-size:15px;color:#6a6f76;line-height:1.7;">
                Hola <strong style="color:#191a1c;">${nombre}</strong>,<br>
                tu inscripción al <strong style="color:#e2001a;">Running Trail Huracán de Chivilcoy</strong>
                fue confirmada exitosamente. Encontrás a continuación el resumen de tu participación.
              </p>
            </td>
          </tr>


          <!-- ══ CARRERA DESTACADA ══ -->
          <tr>
            <td style="background:#ffffff;padding:0 28px 24px;border-left:1px solid rgba(0,0,0,.10);border-right:1px solid rgba(0,0,0,.10);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f5f6f8;border:1.5px solid rgba(226,0,26,.30);border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#e2001a;text-transform:uppercase;margin-bottom:6px;">Carrera</div>
                          <div style="font-size:28px;font-weight:900;color:#191a1c;line-height:1;">${dist}</div>
                          <div style="font-size:12px;color:#6a6f76;margin-top:2px;">${tipo}${carrera === 'caminata' ? '' : ' · Con cronometraje oficial'}</div>
                        </td>
                        <td style="text-align:right;vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#e2001a;text-transform:uppercase;margin-bottom:6px;">Monto abonado</div>
                          ${monto < montoOriginal ? `<div style="font-size:13px;color:#9aa0a6;text-decoration:line-through;line-height:1;margin-bottom:3px;">$${montoOriginal.toLocaleString('es-AR')}</div>` : ''}
                          <div style="font-size:26px;font-weight:900;color:#e2001a;line-height:1;">$${monto.toLocaleString('es-AR')}</div>
                          <div style="font-size:11px;color:#6a6f76;margin-top:2px;">${remeraTexto}${monto < montoOriginal ? ' · Con descuento' : ''}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ══ INFO EVENTO ══ -->
          <tr>
            <td style="background:#ffffff;padding:0 28px 24px;border-left:1px solid rgba(0,0,0,.10);border-right:1px solid rgba(0,0,0,.10);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f5f6f8;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,.10);">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.10);">
                    <span style="font-size:16px;">🗓</span>
                    <span style="font-size:14px;font-weight:600;color:#191a1c;margin-left:10px;">17 de octubre · Hora a confirmar</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;">
                    <span style="font-size:16px;">📍</span>
                    <span style="font-size:14px;font-weight:600;color:#191a1c;margin-left:10px;">Club Atlético Huracán, Chivilcoy</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ══ DATOS DEL CORREDOR ══ -->
          <tr>
            <td style="background:#ffffff;padding:0 28px 24px;border-left:1px solid rgba(0,0,0,.10);border-right:1px solid rgba(0,0,0,.10);">

              <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#e2001a;text-transform:uppercase;margin-bottom:12px;">
                Datos del corredor
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f5f6f8;border-radius:12px;border:1px solid rgba(0,0,0,.10);overflow:hidden;">

                <!-- fila -->
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);width:40%;">
                    <span style="font-size:11px;color:#6a6f76;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Nombre</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:14px;color:#191a1c;font-weight:600;">${nombreCompleto}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:11px;color:#6a6f76;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">DNI</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:14px;color:#191a1c;">${fmtDni(dni)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:11px;color:#6a6f76;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Fecha de nac.</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:14px;color:#191a1c;">${fechaNacTexto}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:11px;color:#6a6f76;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Edad</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:14px;color:#191a1c;">${edad} años</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:11px;color:#6a6f76;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Sexo</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:14px;color:#191a1c;">${fmtSexo(sexo)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:11px;color:#6a6f76;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Ciudad</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:14px;color:#191a1c;">${ciudad}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:11px;color:#6a6f76;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Domicilio</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);">
                    <span style="font-size:14px;color:#191a1c;">${domicilio}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;">
                    <span style="font-size:11px;color:#6a6f76;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Teléfono</span>
                  </td>
                  <td style="padding:12px 18px;">
                    <span style="font-size:14px;color:#191a1c;">+${codpais || '54'} ${codarea} ${telefono}</span>
                  </td>
                </tr>

              </table>
            </td>
          </tr>


          <!-- ══ KIT ══ -->
          <tr>
            <td style="background:#ffffff;padding:0 28px 28px;border-left:1px solid rgba(0,0,0,.10);border-right:1px solid rgba(0,0,0,.10);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f5f6f8;border:1.5px solid rgba(226,0,26,.22);border-radius:14px;">
                <tr>
                  <td style="padding:20px 22px;">
                   <div style="font-size:14px;color:#6a6f76;line-height:1.9;">

  <div style="margin-bottom:14px;">
    <div style="font-size:12px;letter-spacing:0.05em;color:#e2001a;text-transform:uppercase;margin-bottom:4px;">Chivilcoy</div>
    Retirá tu kit el día previo a la carrera.<br>
    <strong style="color:#191a1c;">Viernes 16 de octubre · 17:00 a 19:00 hs</strong><br>
    Club Atlético Huracán, Chivilcoy
  </div>

  <div style="border-top:1px solid rgba(0,0,0,.10);padding-top:14px;">
    <div style="font-size:12px;letter-spacing:0.05em;color:#e2001a;text-transform:uppercase;margin-bottom:4px;">Otras localidades</div>
    Tu kit se entregará el mismo día de la carrera al momento de presentarte.<br>
    <strong style="color:#191a1c;">17 de octubre · Horario a confirmar</strong><br>
    Club Atlético Huracán, Chivilcoy
  </div>

</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ══ FOOTER ══ -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 20px 20px;padding:24px 28px;text-align:center;border:1px solid rgba(0,0,0,.10);border-top:1px solid rgba(0,0,0,.10);">
              <p style="margin:0;font-size:12px;color:#9aa0a6;">
                Running Trail Huracán de Chivilcoy · 1ª Edición 2026
              </p>
            </td>
          </tr>


        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();

  await resend.emails.send({
    from: 'Running Trail Huracán <no-reply@huracandechivilcoy.com.ar>',
    to:   email,
    subject: `✅ Inscripción confirmada – Running Trail Huracán ${dist} ${tipo}`,
    html,
  });
}

/* ─────────────────────────────────────────
   POST /inscripciones — PÚBLICO
───────────────────────────────────────── */
router.post('/', upload.single('comprobante'), async (req, res) => {
  try {
    const {
      carrera, remera, talle,
      nombre, apellido, sexo, edad, dni, fechaNacimiento, codpais,
      codarea, telefono, email, ciudad, domicilio,
      firmaBase64,
    } = req.body;

    if (!carrera || !remera || !nombre || !apellido || !sexo || !edad || !dni ||
        !codarea || !telefono || !email || !ciudad || !domicilio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    if (!firmaBase64 || !/^data:image\/(png|jpeg);base64,/.test(firmaBase64)) {
      return res.status(400).json({ error: 'La firma digital es obligatoria.' });
    }

    if (!PRICES[carrera] || PRICES[carrera][remera] === undefined) {
      return res.status(400).json({ error: 'Carrera o remera inválida.' });
    }

    const montoOriginal = PRICES[carrera][remera];

    // Validar el comprobante ANTES de consumir un uso del código de descuento
    if (montoOriginal > 0 && !req.file) {
      return res.status(400).json({ error: 'El comprobante es obligatorio.' });
    }

    // Si viene código de descuento, buscarlo acá (el consumo del uso se hace
    // recién en la transacción final, junto con la creación de la inscripción)
    let codigoDB = null;
    if (req.body.codigoDescuento) {
      codigoDB = await prisma.codigoDescuento.findUnique({
        where: { codigo: req.body.codigoDescuento }
      });
      if (codigoDB && !codigoDB.activo) codigoDB = null;
    }

    // ── Promo "primeros 100": pre-chequeo ANTES de subir el comprobante ──
    // (la verdad definitiva se decide en la transacción final; esto solo
    //  evita subir el archivo si la reserva ya venció y no quedan cupos)
    const promoToken = req.body.promoToken;
    const aplicaPromo = PROMO.activo && montoOriginal > 0 && !!promoToken;
    if (aplicaPromo) {
      const reserva = await prisma.promoReserva.findUnique({ where: { token: promoToken } });
      const vigente = reserva && reserva.estado === 'activa' && reserva.expiresAt > new Date();
      if (!vigente) {
        const ocupados = await prisma.promoReserva.count({ where: whereCupoOcupado() });
        if (ocupados >= PROMO.cupoMaximo) {
          return res.status(409).json({
            error: 'Tu reserva del descuento venció y ya no quedan cupos.',
            code:  'PROMO_AGOTADA',
          });
        }
      }
    }

    let comprobanteUrl = 'GRATIS';
    let comprobantePublicId = 'GRATIS';

    if (montoOriginal > 0) {
      const uploadResult = await new Promise((resolve, reject) => {
        const isPdf = req.file.mimetype === 'application/pdf';
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'huracan/comprobantes',
            resource_type: isPdf ? 'raw' : 'image',
          },
          (error, result) => { if (error) reject(error); else resolve(result); }
        );
        stream.end(req.file.buffer);
      });
      comprobanteUrl = uploadResult.secure_url;
      comprobantePublicId = uploadResult.public_id;
    }

    // ── Transacción final: consume la reserva de la promo (si corresponde)
    //    y crea la inscripción, todo atómico bajo el advisory lock ──
    let inscripcion;
    try {
      inscripcion = await prisma.$transaction(async (tx) => {
        let descuentoPromo = 0;
        let reservaId = null;
        let descuentoCodigo = 0;
        let codigoDescuentoId = null;

        // Consumo atómico del código de descuento (updateMany condicional):
        // dos requests simultáneos no pueden llevarse el mismo último uso.
        if (codigoDB) {
          const consumo = await tx.codigoDescuento.updateMany({
            where: { id: codigoDB.id, activo: true, usosActuales: { lt: codigoDB.usosMaximos } },
            data:  { usosActuales: { increment: 1 } },
          });
          if (consumo.count === 1) {
            if (codigoDB.tipo === 'porcentaje' && codigoDB.porcentaje) {
              descuentoCodigo = Math.floor(montoOriginal * codigoDB.porcentaje / 100);
            } else if (codigoDB.tipo === 'montoFijo' && codigoDB.montoFijo) {
              descuentoCodigo = Math.min(codigoDB.montoFijo, montoOriginal);
            }
            codigoDescuentoId = codigoDB.id;
          }
        }

        if (aplicaPromo) {
          // ::text — pg_advisory_xact_lock devuelve void y Prisma no sabe deserializarlo
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(${PROMO_LOCK_KEY})::text`;

          let reserva = await tx.promoReserva.findUnique({ where: { token: promoToken } });
          const vigente = reserva && reserva.estado === 'activa' && reserva.expiresAt > new Date();

          if (!vigente) {
            // La reserva venció (o no existe): si todavía queda cupo, se lo
            // damos igual — re-claim. Si no queda, se pierde el descuento.
            const ocupados = await tx.promoReserva.count({ where: whereCupoOcupado() });
            if (ocupados >= PROMO.cupoMaximo) {
              const e = new Error('PROMO_AGOTADA');
              e.code = 'PROMO_AGOTADA';
              throw e;
            }
            if (!reserva || reserva.estado === 'usada') {
              reserva = await tx.promoReserva.create({
                data: { token: crypto.randomUUID(), estado: 'activa', expiresAt: new Date() },
              });
            }
          }

          descuentoPromo = Math.floor(montoOriginal * PROMO.porcentaje / 100);
          reservaId = reserva.id;
        }

        const monto = Math.max(0, montoOriginal - descuentoCodigo - descuentoPromo);

        const insc = await tx.inscripcion.create({
          data: {
            carrera, remera,
            talle:          remera === 'con' ? (talle || null) : null,
            monto,
            montoOriginal,
            codigoDescuentoId,
            nombre, apellido, sexo,
            edad:           parseInt(edad),
            dni,
            fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento + 'T00:00:00') : null,
            codpais: codpais || '54', codarea, telefono, email, ciudad, domicilio,
            comprobanteUrl,
            comprobantePublicId,
            firmaBase64,
            estado: 'pendiente',
          },
        });

        if (reservaId) {
          await tx.promoReserva.update({
            where: { id: reservaId },
            data:  { estado: 'usada', inscripcionId: insc.id },
          });
        }

        return insc;
      }, { maxWait: 15000, timeout: 30000 });
    } catch (err) {
      if (err.code === 'PROMO_AGOTADA') {
        // El comprobante ya se subió: lo borramos para no dejar huérfanos
        if (comprobantePublicId !== 'GRATIS') {
          cloudinary.uploader.destroy(comprobantePublicId, {
            resource_type: req.file && req.file.mimetype === 'application/pdf' ? 'raw' : 'image',
          }).catch(() => {});
        }
        return res.status(409).json({
          error: 'Tu reserva del descuento venció y ya no quedan cupos.',
          code:  'PROMO_AGOTADA',
        });
      }
      throw err;
    }

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
      // promoReserva presente ⇒ usó el descuento "primeros 100"
      include: { promoReserva: { select: { id: true, estado: true } } },
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

    // Enviar email de confirmación (sin bloquear la respuesta si falla)
    enviarEmailConfirmacion(actualizada).catch(err =>
      console.error(`[Email] Error al enviar confirmación (id ${id}):`, err)
    );

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

    // Si la inscripción usaba un cupo de la promo "primeros 100", se libera
    // para que otro corredor pueda tomarlo.
    await prisma.promoReserva.updateMany({
      where: { inscripcionId: id, estado: 'usada' },
      data:  { estado: 'liberada' },
    });

    res.json({ ok: true, inscripcion: actualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;