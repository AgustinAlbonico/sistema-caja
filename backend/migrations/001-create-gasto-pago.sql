-- Migration: Create gastoPagos table for mixed payment methods in expenses
-- Created: 2025-02-04

CREATE TABLE IF NOT EXISTS "gastoPagos" (
    "idGastoPago" SERIAL PRIMARY KEY,
    "idGasto" INTEGER NOT NULL,
    "idMetodoPago" INTEGER NOT NULL,
    "importe" NUMERIC(18, 2) NOT NULL,
    "referencia" VARCHAR(100) NULL,
    CONSTRAINT "fk_gasto_pago_gasto" FOREIGN KEY ("idGasto") REFERENCES "gastos"("idGasto") ON DELETE CASCADE,
    CONSTRAINT "fk_gasto_pago_metodo" FOREIGN KEY ("idMetodoPago") REFERENCES "metodosPago"("idMetodoPago") ON DELETE RESTRICT
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "idx_gasto_pagos_gasto" ON "gastoPagos"("idGasto");
CREATE INDEX IF NOT EXISTS "idx_gasto_pagos_metodo" ON "gastoPagos"("idMetodoPago");

-- Add column to gastos for createdAt if not exists
ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMENT ON TABLE "gastoPagos" IS 'Pagos mixtos asociados a gastos/egresos';
