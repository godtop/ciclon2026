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
    ciudad, domicilio, codpais, codarea, telefono, createdAt,
  } = inscripcion;

  const nombreCompleto = `${nombre} ${apellido}`;
  const remeraTexto    = remera === 'con' ? `Con remera · Talle ${talle}` : 'Sin remera';
  const fechaNacTexto  = fechaNacimiento ? fmtFecha(fechaNacimiento) : '—';
  const carreraLabel   = carrera === '4k' ? '4K — Participativa' : '10K — Competitiva';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscripción Confirmada</title>
</head>
<body style="margin:0;padding:0;background:#0b1a10;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- WRAPPER -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1a10;padding:24px 0 48px;">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:540px;">


          <!-- ══ HERO HEADER ══ -->
          <tr>
            <td style="background:#0f2416;border-radius:20px 20px 0 0;padding:36px 28px 32px;text-align:center;border:1px solid #1e4d2a;border-bottom:none;">

              <!-- Edition tag -->
              <div style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:3px;color:#3ddc6b;text-transform:uppercase;border:1px solid rgba(61,220,107,.3);border-radius:20px;padding:4px 14px;margin-bottom:20px;">
                ✦ TERCERA EDICIÓN ✦
              </div>

              <!-- Title -->
              <div style="font-size:42px;font-weight:900;color:#f5f9f6;letter-spacing:-1px;line-height:1;margin-bottom:4px;">
                MARATÓN
              </div>
              <div style="font-size:14px;font-weight:600;color:#3ddc6b;letter-spacing:3px;margin-bottom:28px;">
                CLUB CICLÓN · CHIVILCOY
              </div>

              <!-- Confirmed badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e8a3c,#145c28);border-radius:14px;padding:18px 28px;text-align:center;">
                    <div style="font-size:32px;line-height:1;margin-bottom:8px;">✅</div>
                    <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.5px;margin-bottom:4px;">
                      INSCRIPCIÓN CONFIRMADA
                    </div>
                    <div style="font-size:13px;color:rgba(255,255,255,0.75);font-weight:500;">
                      Pago verificado · Ya sos parte de la carrera
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>


          <!-- ══ GREETING ══ -->
          <tr>
            <td style="background:#0f2416;padding:0 28px 28px;border-left:1px solid #1e4d2a;border-right:1px solid #1e4d2a;">
              <p style="margin:20px 0 0;font-size:15px;color:#aabfb0;line-height:1.7;">
                Hola <strong style="color:#f5f9f6;">${nombre}</strong>,<br>
                tu inscripción a la <strong style="color:#2db54f;">Maratón Club Ciclón 3ª Edición</strong>
                fue confirmada exitosamente. Encontrás a continuación el resumen de tu participación.
              </p>
            </td>
          </tr>


          <!-- ══ CARRERA DESTACADA ══ -->
          <tr>
            <td style="background:#0f2416;padding:0 28px 24px;border-left:1px solid #1e4d2a;border-right:1px solid #1e4d2a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:linear-gradient(135deg,#162b1c,#0f2416);border:1.5px solid rgba(46,181,80,.35);border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#3ddc6b;text-transform:uppercase;margin-bottom:6px;">Carrera</div>
                          <div style="font-size:28px;font-weight:900;color:#ffffff;line-height:1;">${carrera.toUpperCase()}</div>
                          <div style="font-size:12px;color:#aabfb0;margin-top:2px;">${carrera === '4k' ? 'Participativa' : 'Competitiva'} · Con cronometraje oficial</div>
                        </td>
                        <td style="text-align:right;vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#3ddc6b;text-transform:uppercase;margin-bottom:6px;">Monto abonado</div>
                          <div style="font-size:26px;font-weight:900;color:#2db54f;line-height:1;">$${monto.toLocaleString('es-AR')}</div>
                          <div style="font-size:11px;color:#aabfb0;margin-top:2px;">${remeraTexto}</div>
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
            <td style="background:#0f2416;padding:0 28px 24px;border-left:1px solid #1e4d2a;border-right:1px solid #1e4d2a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:#0b1a10;border-radius:12px;overflow:hidden;border:1px solid #1e4d2a;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #1e4d2a;">
                    <span style="font-size:16px;">🗓</span>
                    <span style="font-size:14px;font-weight:600;color:#f5f9f6;margin-left:10px;">Domingo 14 de junio · 10:00 AM</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;">
                    <span style="font-size:16px;">📍</span>
                    <span style="font-size:14px;font-weight:600;color:#f5f9f6;margin-left:10px;">Club Atlético Ciclón, Chivilcoy</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ══ DATOS DEL CORREDOR ══ -->
          <tr>
            <td style="background:#0f2416;padding:0 28px 24px;border-left:1px solid #1e4d2a;border-right:1px solid #1e4d2a;">

              <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#3ddc6b;text-transform:uppercase;margin-bottom:12px;">
                Datos del corredor
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:#0b1a10;border-radius:12px;border:1px solid #1e4d2a;overflow:hidden;">

                <!-- fila -->
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;width:40%;">
                    <span style="font-size:11px;color:#6b9a78;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Nombre</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:14px;color:#f5f9f6;font-weight:600;">${nombreCompleto}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:11px;color:#6b9a78;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">DNI</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:14px;color:#d0e8d8;">${fmtDni(dni)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:11px;color:#6b9a78;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Fecha de nac.</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:14px;color:#d0e8d8;">${fechaNacTexto}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:11px;color:#6b9a78;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Edad</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:14px;color:#d0e8d8;">${edad} años</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:11px;color:#6b9a78;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Sexo</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:14px;color:#d0e8d8;">${fmtSexo(sexo)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:11px;color:#6b9a78;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Ciudad</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:14px;color:#d0e8d8;">${ciudad}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:11px;color:#6b9a78;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Domicilio</span>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a3520;">
                    <span style="font-size:14px;color:#d0e8d8;">${domicilio}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;">
                    <span style="font-size:11px;color:#6b9a78;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Teléfono</span>
                  </td>
                  <td style="padding:12px 18px;">
                    <span style="font-size:14px;color:#d0e8d8;">+${codpais || '54'} ${codarea} ${telefono}</span>
                  </td>
                </tr>

              </table>
            </td>
          </tr>


          <!-- ══ KIT ══ -->
          <tr>
            <td style="background:#0f2416;padding:0 28px 28px;border-left:1px solid #1e4d2a;border-right:1px solid #1e4d2a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:#162211;border:1.5px solid rgba(61,220,107,.25);border-radius:14px;">
                <tr>
                  <td style="padding:20px 22px;">
                   <div style="font-size:14px;color:#aabfb0;line-height:1.9;">

  <div style="margin-bottom:14px;">
    <div style="font-size:12px;letter-spacing:0.05em;color:#6a8f78;text-transform:uppercase;margin-bottom:4px;">Chivilcoy</div>
    Retirá tu kit el día previo a la carrera.<br>
    <strong style="color:#f5f9f6;">Sábado 13 de junio · 14:00 a 19:00 hs</strong><br>
    Club Atlético Ciclón, Chivilcoy
  </div>

  <div style="border-top:0.5px solid #2e4a38;padding-top:14px;">
    <div style="font-size:12px;letter-spacing:0.05em;color:#6a8f78;text-transform:uppercase;margin-bottom:4px;">Otras localidades</div>
    Tu kit se entregará el mismo día de la carrera al momento de presentarte.<br>
    <strong style="color:#f5f9f6;">Domingo 14 de junio · Desde las 8:30 hs</strong><br>
    Club Atlético Ciclón, Chivilcoy
  </div>

</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ══ FOOTER ══ -->
          <tr>
            <td style="background:#0b1a10;border-radius:0 0 20px 20px;padding:24px 28px;text-align:center;border:1px solid #1e4d2a;border-top:1px solid #1e4d2a;">
              <p style="margin:0 0 6px;font-size:12px;color:#4a7a58;">
                Maratón Club Ciclón Chivilcoy · 3ª Edición 2026
              </p>
              <p style="margin:0;font-size:11px;color:#2d4d38;">
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
        codpais: codpais || '54',codarea, telefono, email, ciudad, domicilio,
        comprobanteUrl:      uploadResult.secure_url,
        comprobantePublicId: uploadResult.public_id,
        firmaBase64,
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