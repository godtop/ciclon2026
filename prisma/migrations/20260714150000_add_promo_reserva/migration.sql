-- CreateTable
CREATE TABLE "PromoReserva" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inscripcionId" INTEGER,

    CONSTRAINT "PromoReserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoReserva_token_key" ON "PromoReserva"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PromoReserva_inscripcionId_key" ON "PromoReserva"("inscripcionId");

-- AddForeignKey
ALTER TABLE "PromoReserva" ADD CONSTRAINT "PromoReserva_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
