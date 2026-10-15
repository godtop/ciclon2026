-- CreateTable
CREATE TABLE "StockRemera" (
    "talle" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockRemera_pkey" PRIMARY KEY ("talle")
);

-- Stock inicial: S agotado (stock = lo ya pedido), el resto con 15 disponibles
-- además de lo que ya se pidió.
INSERT INTO "StockRemera" ("talle", "stock", "updatedAt")
SELECT t.talle,
       (SELECT COUNT(*) FROM "Inscripcion" i
         WHERE i."remera" = 'con' AND i."talle" = t.talle AND i."estado" <> 'rechazado')
       + CASE WHEN t.talle = 'S' THEN 0 ELSE 15 END,
       CURRENT_TIMESTAMP
FROM (VALUES ('XS'), ('S'), ('M'), ('L'), ('XL'), ('XXL')) AS t(talle);
