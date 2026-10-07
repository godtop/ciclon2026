-- Corte de la remera (mujer/hombre). Las inscripciones existentes con remera
-- toman el corte según el sexo cargado.
ALTER TABLE "Inscripcion" ADD COLUMN "corte" TEXT;
UPDATE "Inscripcion" SET "corte" = CASE WHEN "sexo" = 'M' THEN 'hombre' ELSE 'mujer' END
WHERE "remera" = 'con';

-- El stock pasa a ser por (corte, talle). Las filas existentes quedan como 'mujer'.
ALTER TABLE "StockRemera" ADD COLUMN "corte" TEXT NOT NULL DEFAULT 'mujer';
ALTER TABLE "StockRemera" DROP CONSTRAINT "StockRemera_pkey";
ALTER TABLE "StockRemera" ADD CONSTRAINT "StockRemera_pkey" PRIMARY KEY ("corte", "talle");
ALTER TABLE "StockRemera" ALTER COLUMN "corte" DROP DEFAULT;

INSERT INTO "StockRemera" ("corte", "talle", "stock", "updatedAt")
SELECT 'hombre', t.talle, 0, CURRENT_TIMESTAMP
FROM (VALUES ('XS'), ('S'), ('M'), ('L'), ('XL'), ('XXL')) AS t(talle);

-- Stock = lo ya pedido + lo disponible para vender a partir de hoy
UPDATE "StockRemera" s SET
  "stock" = (SELECT COUNT(*) FROM "Inscripcion" i
              WHERE i."remera" = 'con' AND i."corte" = s."corte" AND i."talle" = s."talle"
                AND i."estado" <> 'rechazado') + t.disponibles,
  "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
  ('mujer',  'XS', 15), ('mujer',  'S', 15), ('mujer',  'M', 15),
  ('mujer',  'L',  15), ('mujer',  'XL', 15), ('mujer', 'XXL', 10),
  ('hombre', 'XS',  0), ('hombre', 'S',  3), ('hombre', 'M', 15),
  ('hombre', 'L',  25), ('hombre', 'XL', 13), ('hombre', 'XXL', 10)
) AS t(corte, talle, disponibles)
WHERE s."corte" = t.corte AND s."talle" = t.talle;
