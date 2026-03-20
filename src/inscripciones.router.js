const express    = require('express');
const router     = express.Router();
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('./cloudinary');
const upload     = require('./upload');
const requireAuth = require('./auth.middleware');
const { Resend } = require('resend');

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const PRICES = {
  '4k':  { con: 23000, sin: 15000 },
  '10k': { con: 30000, sin: 22000 },
};

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
    monto, dni, edad, sexo, fechaNacimiento,
    ciudad, domicilio, codarea, telefono, createdAt,
  } = inscripcion;

  const nombreCompleto = `${nombre} ${apellido}`;
  const remeraTexto    = remera === 'con' ? `Con remera · Talle ${talle}` : 'Sin remera';
  const fechaNacTexto  = fechaNacimiento ? fmtFecha(fechaNacimiento) : '—';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscripción Confirmada – Maratón Club Ciclón</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#e63946 0%,#c1121f 100%);border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:12px;">✦ Tercera Edición ✦</div>
              <div style="font-size:48px;font-weight:900;color:#ffffff;letter-spacing:-2px;line-height:1;margin-bottom:4px;">MARATÓN</div>
              <div style="font-size:16px;font-weight:600;color:rgba(255,255,255,0.85);letter-spacing:2px;">Club Ciclón · Chivilcoy</div>
            </td>
          </tr>

          <!-- CONFIRMATION BADGE -->
          <tr>
            <td style="background:#1a1a1a;padding:32px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0d2b0d;border:1.5px solid #2d6a2d;border-radius:12px;padding:20px 24px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:32px;padding-right:16px;">✅</td>
                        <td>
                          <div style="font-size:18px;font-weight:700;color:#4ade80;margin-bottom:4px;">¡Inscripción confirmada!</div>
                          <div style="font-size:14px;color:#86efac;">Tu pago fue verificado. Ya sos parte de la carrera.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- GREETING -->
          <tr>
            <td style="background:#1a1a1a;padding:28px 32px 0;">
              <p style="margin:0;font-size:16px;color:#e0e0e0;line-height:1.6;">
                Hola <strong style="color:#ffffff;">${nombreCompleto}</strong>,
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:#aaaaaa;line-height:1.7;">
                Tu inscripción a la <strong style="color:#e63946;">Maratón Club Ciclón – 3ª Edición</strong> fue confirmada correctamente.
                A continuación encontrás el resumen de tu participación.
              </p>
            </td>
          </tr>

          <!-- EVENT INFO -->
          <tr>
            <td style="background:#1a1a1a;padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#242424;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:18px;">🗓</span>
                    <span style="font-size:14px;font-weight:600;color:#ffffff;margin-left:10px;">Domingo 14 de Junio de 2026</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:18px;">⏰</span>
                    <span style="font-size:14px;font-weight:600;color:#ffffff;margin-left:10px;">10:00 AM</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="font-size:18px;">📍</span>
                    <span style="font-size:14px;font-weight:600;color:#ffffff;margin-left:10px;">Club Atlético Ciclón, Chivilcoy</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PARTICIPANT DATA -->
          <tr>
            <td style="background:#1a1a1a;padding:24px 32px 0;">
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:14px;">Datos del corredor</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#242424;border-radius:12px;overflow:hidden;">

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;width:42%;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Nombre</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:14px;color:#ffffff;font-weight:600;">${nombreCompleto}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">DNI</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:14px;color:#e0e0e0;">${fmtDni(dni)}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fecha de nac.</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:14px;color:#e0e0e0;">${fechaNacTexto}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Edad</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:14px;color:#e0e0e0;">${edad} años</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Sexo</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:14px;color:#e0e0e0;">${fmtSexo(sexo)}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Ciudad</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:14px;color:#e0e0e0;">${ciudad}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Domicilio</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:14px;color:#e0e0e0;">${domicilio}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Teléfono</span>
                  </td>
                  <td style="padding:13px 20px;">
                    <span style="font-size:14px;color:#e0e0e0;">+54 ${codarea} ${telefono}</span>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- RACE DATA -->
          <tr>
            <td style="background:#1a1a1a;padding:24px 32px 0;">
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:14px;">Detalles de inscripción</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#242424;border-radius:12px;overflow:hidden;">

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;width:42%;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Carrera</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:16px;font-weight:800;color:#e63946;">${carrera.toUpperCase()}</span>
                    <span style="font-size:13px;color:#888;margin-left:8px;">${carrera === '4k' ? 'Participativa' : 'Competitiva'}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Remera</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:14px;color:#e0e0e0;">${remeraTexto}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Inscripción</span>
                  </td>
                  <td style="padding:13px 20px;border-bottom:1px solid #333;">
                    <span style="font-size:13px;color:#aaaaaa;">${fmtFecha(createdAt)}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 20px;">
                    <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Monto abonado</span>
                  </td>
                  <td style="padding:13px 20px;">
                    <span style="font-size:18px;font-weight:800;color:#4ade80;">$${monto.toLocaleString('es-AR')}</span>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- KIT PICKUP -->
          <tr>
            <td style="background:#1a1a1a;padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1a10;border:1.5px solid #4a3f00;border-radius:12px;padding:20px 24px;">
                <tr>
                  <td>
                    <div style="font-size:15px;font-weight:700;color:#fbbf24;margin-bottom:10px;">👕 Retiro de kit</div>
                    <div style="font-size:14px;color:#d4b483;line-height:1.7;">
                      Podés retirar tu kit el día anterior a la carrera:<br>
                      <strong style="color:#fbbf24;">Sábado 13 de junio · 9:00 a 13:00 hs</strong><br>
                      Club Atlético Ciclón, Chivilcoy
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#1a1a1a;padding:32px;border-radius:0 0 16px 16px;border-top:1px solid #2a2a2a;margin-top:24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#666;text-align:center;">
                Maratón Club Ciclón Chivilcoy · 3ª Edición 2026
              </p>
              <p style="margin:0;font-size:12px;color:#444;text-align:center;">
                Auspicia YPF · Primas Group
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
    from: 'Maratón Club Ciclón <no-reply@ciclon.com.ar>',
    to:   email,
    subject: `✅ Inscripción confirmada – Maratón Club Ciclón ${carrera.toUpperCase()}`,
    html,
  });
}

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
    res.json({ ok: true, inscripcion: actualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;