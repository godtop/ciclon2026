-- CreateTable
CREATE TABLE "CodigoDescuento" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "porcentaje" INTEGER,
    "montoFijo" INTEGER,
    "usosMaximos" INTEGER NOT NULL,
    "usosActuales" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodigoDescuento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "carrera" TEXT NOT NULL,
    "remera" TEXT NOT NULL,
    "talle" TEXT,
    "monto" INTEGER NOT NULL,
    "codigoDescuentoId" INTEGER,
    "montoOriginal" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "sexo" TEXT NOT NULL,
    "edad" INTEGER NOT NULL,
    "dni" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "codpais" TEXT NOT NULL DEFAULT '54',
    "codarea" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "domicilio" TEXT NOT NULL,
    "comprobanteUrl" TEXT NOT NULL,
    "comprobantePublicId" TEXT NOT NULL,
    "firmaBase64" TEXT NOT NULL DEFAULT '0123456789',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodigoDescuento_codigo_key" ON "CodigoDescuento"("codigo");

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_codigoDescuentoId_fkey" FOREIGN KEY ("codigoDescuentoId") REFERENCES "CodigoDescuento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
