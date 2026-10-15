// Envía el email de confirmación de una inscripción ya cargada en la DB.
// Uso: node scripts/enviar-confirmacion.js <email>
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { enviarEmailConfirmacion } = require('../src/inscripciones.router');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: node scripts/enviar-confirmacion.js <email>');
    process.exit(1);
  }

  const inscripcion = await prisma.inscripcion.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    orderBy: { id: 'desc' },
  });

  if (!inscripcion) {
    console.error(`✗ No se encontró inscripción con el email ${email}`);
    process.exit(1);
  }

  await enviarEmailConfirmacion(inscripcion);
  console.log(`✅ Email de confirmación enviado a ${email} (inscripción #${inscripcion.id}, estado: ${inscripcion.estado})`);
}

main()
  .catch(err => {
    console.error('✗ Error:', err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
