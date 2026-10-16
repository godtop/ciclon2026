// Reenvía el email de confirmación (con la info actualizada y un aviso arriba)
// a todos los confirmados de 15K y 5K Participativa.
// Uso:
//   node scripts/reenviar-actualizacion.js            → solo lista destinatarios (no envía)
//   node scripts/reenviar-actualizacion.js --preview [archivo]  → guarda el HTML de ejemplo (no envía)
//   node scripts/reenviar-actualizacion.js --enviar   → envía de verdad
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { enviarEmailConfirmacion } = require('../src/inscripciones.router');

const prisma = new PrismaClient();

const ASUNTO = '⚠️ URGENTE: Cambio en el retiro de kit – Running Trail Huracán';
const AVISO  = `
  Te reenviamos tu confirmación con la información actualizada.<br>
  <strong>Retiro de kit:</strong> sábado 17 de octubre a partir de las 13:00 hs, en el Club Atlético Huracán, Chivilcoy.<br>
  <strong>Largada:</strong> sábado 17 de octubre a las 17:00 hs.
`;

async function main() {
  const enviar  = process.argv.includes('--enviar');
  const preview = process.argv.includes('--preview');

  const inscripciones = await prisma.inscripcion.findMany({
    where:   { estado: 'confirmado', carrera: { in: ['15k', '7k'] } },
    orderBy: { id: 'asc' },
  });

  console.log(`Destinatarios: ${inscripciones.length}`);
  inscripciones.forEach(i => console.log(`  #${i.id}  ${i.carrera.padEnd(4)}  ${i.nombre} ${i.apellido} <${i.email}>`));

  if (preview) {
    const { subject, html } = await enviarEmailConfirmacion(inscripciones[0], { asunto: ASUNTO, aviso: AVISO, soloPreview: true });
    require('fs').writeFileSync(process.argv[process.argv.indexOf('--preview') + 1] || 'preview-actualizacion.html', html);
    console.log(`
Asunto: ${subject}
Preview guardado.`);
    return;
  }

  if (!enviar) {
    console.log('\n(No se envió nada. Usá --enviar para mandar los emails.)');
    return;
  }

  let ok = 0, fail = 0;
  for (const i of inscripciones) {
    try {
      await enviarEmailConfirmacion(i, { asunto: ASUNTO, aviso: AVISO });
      ok++;
      console.log(`✅ #${i.id} ${i.email}`);
    } catch (err) {
      fail++;
      console.error(`✗ #${i.id} ${i.email}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 600)); // respetar rate limit de Resend
  }
  console.log(`\nEnviados: ${ok} · Fallidos: ${fail}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
