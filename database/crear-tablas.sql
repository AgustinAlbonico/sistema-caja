-- ============================================
-- SCRIPT: Creación de Tablas - Sistema de Caja
-- ============================================
-- Sistema: Sistema de Gestión de Recibos y Caja
-- Fecha: 10/02/2026
-- Versión: 1.0
-- Orden de creación respetando dependencias FK
-- ============================================

-- ============================================
-- 1. TABLA: usuarios
-- Dependencias: Ninguna (tabla base)
-- ============================================
CREATE TABLE IF NOT EXISTS "usuarios" (
  "idUsuario" SERIAL PRIMARY KEY,
  "nombreUsuario" VARCHAR(100) UNIQUE NOT NULL,
  "contrasenaHash" VARCHAR(255) NOT NULL,
  "nombreCompleto" VARCHAR(200) NOT NULL,
  "activo" BOOLEAN DEFAULT true,
  "fechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. TABLA: clientes
-- Dependencias: Ninguna
-- ============================================
CREATE TABLE IF NOT EXISTS "clientes" (
  "idCliente" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "localidad" VARCHAR(100),
  "direccion" VARCHAR(100),
  "codPostal" VARCHAR(100),
  "telefono" VARCHAR(100),
  "cuit" VARCHAR(100),
  "categoria" VARCHAR(100),
  "provincia" VARCHAR(100),
  "fechaAlta" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "idUsuarioCreacion" INTEGER
);

-- ============================================
-- 3. TABLA: conceptos
-- Dependencias: Ninguna
-- ============================================
CREATE TABLE IF NOT EXISTS "conceptos" (
  "idConcepto" SERIAL PRIMARY KEY,
  "descripcion" VARCHAR(255) UNIQUE NOT NULL,
  "activo" BOOLEAN DEFAULT true,
  "fechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. TABLA: metodosPago
-- Dependencias: Ninguna
-- ============================================
CREATE TABLE IF NOT EXISTS "metodosPago" (
  "idMetodoPago" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(50) NOT NULL,
  "activo" BOOLEAN DEFAULT true
);

-- Insertar métodos de pago por defecto
INSERT INTO "metodosPago" ("nombre", "activo") VALUES
  ('Efectivo', true),
  ('Transferencia', true),
  ('Cheque', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. TABLA: cajaDiaria
-- Dependencias: usuarios (FK: idUsuarioApertura, idUsuarioCierre)
-- ============================================
CREATE TABLE IF NOT EXISTS "cajaDiaria" (
  "idCajaDiaria" SERIAL PRIMARY KEY,
  "fecha" DATE UNIQUE NOT NULL,
  "saldoInicial" NUMERIC(18, 2) NOT NULL,
  "saldoFinal" NUMERIC(18, 2),
  "cerrada" BOOLEAN DEFAULT false,
  "fechaCierre" TIMESTAMP,
  "idUsuarioApertura" INTEGER,
  "idUsuarioCierre" INTEGER,
  CONSTRAINT "fk_caja_usuario_apertura" 
    FOREIGN KEY ("idUsuarioApertura") REFERENCES "usuarios"("idUsuario") ON DELETE SET NULL,
  CONSTRAINT "fk_caja_usuario_cierre" 
    FOREIGN KEY ("idUsuarioCierre") REFERENCES "usuarios"("idUsuario") ON DELETE SET NULL
);

-- ============================================
-- 6. TABLA: auditoria
-- Dependencias: usuarios (FK: idUsuario)
-- ============================================
CREATE TABLE IF NOT EXISTS "auditoria" (
  "idAuditoria" SERIAL PRIMARY KEY,
  "idUsuario" INTEGER NOT NULL,
  "accion" VARCHAR(50) NOT NULL,
  "entidad" VARCHAR(50) NOT NULL,
  "idEntidad" INTEGER,
  "detalle" TEXT,
  "fechaAccion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_auditoria_usuario" 
    FOREIGN KEY ("idUsuario") REFERENCES "usuarios"("idUsuario") ON DELETE CASCADE
);

-- ============================================
-- 7. TABLA: recibos
-- Dependencias: clientes (FK: idCliente)
-- ============================================
CREATE TABLE IF NOT EXISTS "recibos" (
  "idRecibo" SERIAL PRIMARY KEY,
  "idCliente" INTEGER NOT NULL,
  "nroComprobante" INTEGER NOT NULL,
  "fechaEmision" TIMESTAMP NOT NULL,
  "total" NUMERIC(18, 2) NOT NULL,
  "idUsuarioCreacion" INTEGER,
  CONSTRAINT "fk_recibo_cliente" 
    FOREIGN KEY ("idCliente") REFERENCES "clientes"("idCliente") ON DELETE CASCADE,
  CONSTRAINT "uqRecibosNro" UNIQUE ("nroComprobante")
);

-- ============================================
-- 8. TABLA: reciboItems
-- Dependencias: recibos (FK: idRecibo)
-- ============================================
CREATE TABLE IF NOT EXISTS "reciboItems" (
  "idReciboItem" SERIAL PRIMARY KEY,
  "idRecibo" INTEGER NOT NULL,
  "descripcion" VARCHAR(100) NOT NULL,
  "mesComprobante" INTEGER NOT NULL,
  "anioComprobante" INTEGER NOT NULL,
  "importe" NUMERIC(18, 2) NOT NULL,
  CONSTRAINT "fk_reciboItem_recibo" 
    FOREIGN KEY ("idRecibo") REFERENCES "recibos"("idRecibo") ON DELETE CASCADE
);

-- ============================================
-- 9. TABLA: pagos
-- Dependencias: recibos (FK: idRecibo), metodosPago (FK: idMetodoPago)
-- ============================================
CREATE TABLE IF NOT EXISTS "pagos" (
  "idPago" SERIAL PRIMARY KEY,
  "idRecibo" INTEGER NOT NULL,
  "idMetodoPago" INTEGER NOT NULL,
  "importe" NUMERIC(18, 2) NOT NULL,
  "referencia" VARCHAR(100),
  CONSTRAINT "fk_pago_recibo" 
    FOREIGN KEY ("idRecibo") REFERENCES "recibos"("idRecibo") ON DELETE CASCADE,
  CONSTRAINT "fk_pago_metodo" 
    FOREIGN KEY ("idMetodoPago") REFERENCES "metodosPago"("idMetodoPago") ON DELETE RESTRICT
);

-- ============================================
-- 10. TABLA: gastos
-- Dependencias: Ninguna
-- ============================================
CREATE TABLE IF NOT EXISTS "gastos" (
  "idGasto" SERIAL PRIMARY KEY,
  "descripcion" VARCHAR(100),
  "importe" NUMERIC(18, 2) NOT NULL,
  "fecha" DATE NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "idUsuarioCreacion" INTEGER
);

-- ============================================
-- 11. TABLA: gastoPagos
-- Dependencias: gastos (FK: idGasto), metodosPago (FK: idMetodoPago)
-- ============================================
CREATE TABLE IF NOT EXISTS "gastoPagos" (
  "idGastoPago" SERIAL PRIMARY KEY,
  "idGasto" INTEGER NOT NULL,
  "idMetodoPago" INTEGER NOT NULL,
  "importe" NUMERIC(18, 2) NOT NULL,
  "referencia" VARCHAR(100),
  CONSTRAINT "fk_gasto_pago_gasto" 
    FOREIGN KEY ("idGasto") REFERENCES "gastos"("idGasto") ON DELETE CASCADE,
  CONSTRAINT "fk_gasto_pago_metodo" 
    FOREIGN KEY ("idMetodoPago") REFERENCES "metodosPago"("idMetodoPago") ON DELETE RESTRICT
);

-- ============================================
-- 12. TABLA: movimientosCaja
-- Dependencias: cajaDiaria (FK), recibos (FK), gastos (FK), metodosPago (FK)
-- ============================================
CREATE TYPE IF NOT EXISTS "tipo_movimiento_caja" AS ENUM ('ingreso', 'egreso');

CREATE TABLE IF NOT EXISTS "movimientosCaja" (
  "idMovimientoCaja" SERIAL PRIMARY KEY,
  "idCajaDiaria" INTEGER NOT NULL,
  "tipo" "tipo_movimiento_caja" NOT NULL,
  "concepto" VARCHAR(100) NOT NULL,
  "importe" NUMERIC(18, 2) NOT NULL,
  "idRecibo" INTEGER,
  "idGasto" INTEGER,
  "idMetodoPago" INTEGER,
  "fecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_movimiento_caja" 
    FOREIGN KEY ("idCajaDiaria") REFERENCES "cajaDiaria"("idCajaDiaria") ON DELETE CASCADE,
  CONSTRAINT "fk_movimiento_recibo" 
    FOREIGN KEY ("idRecibo") REFERENCES "recibos"("idRecibo") ON DELETE SET NULL,
  CONSTRAINT "fk_movimiento_gasto" 
    FOREIGN KEY ("idGasto") REFERENCES "gastos"("idGasto") ON DELETE SET NULL,
  CONSTRAINT "fk_movimiento_metodo" 
    FOREIGN KEY ("idMetodoPago") REFERENCES "metodosPago"("idMetodoPago") ON DELETE SET NULL
);

-- ============================================
-- ÍNDICES (Mejoran el rendimiento de las consultas)
-- ============================================

-- Usuarios
CREATE INDEX IF NOT EXISTS "idx_usuarios_nombre" ON "usuarios"("nombreUsuario");
CREATE INDEX IF NOT EXISTS "idx_usuarios_activos" ON "usuarios"("activo");

-- Clientes
CREATE INDEX IF NOT EXISTS "idx_clientes_nombre" ON "clientes"("nombre");
CREATE INDEX IF NOT EXISTS "idx_clientes_cuit" ON "clientes"("cuit");

-- Recibos
CREATE INDEX IF NOT EXISTS "idx_recibos_cliente" ON "recibos"("idCliente");
CREATE INDEX IF NOT EXISTS "idx_recibos_fecha" ON "recibos"("fechaEmision");
CREATE INDEX IF NOT EXISTS "idx_recibos_comprobante" ON "recibos"("nroComprobante");

-- Recibo Items
CREATE INDEX IF NOT EXISTS "idx_reciboItems_recibo" ON "reciboItems"("idRecibo");

-- Pagos
CREATE INDEX IF NOT EXISTS "idx_pagos_recibo" ON "pagos"("idRecibo");
CREATE INDEX IF NOT EXISTS "idx_pagos_metodo" ON "pagos"("idMetodoPago");

-- Gastos
CREATE INDEX IF NOT EXISTS "idx_gastos_fecha" ON "gastos"("fecha");

-- Gasto Pagos
CREATE INDEX IF NOT EXISTS "idx_gastoPagos_gasto" ON "gastoPagos"("idGasto");
CREATE INDEX IF NOT EXISTS "idx_gastoPagos_metodo" ON "gastoPagos"("idMetodoPago");

-- Caja Diaria
CREATE INDEX IF NOT EXISTS "idx_caja_fecha" ON "cajaDiaria"("fecha");

-- Movimientos Caja
CREATE INDEX IF NOT EXISTS "idx_movimientos_caja" ON "movimientosCaja"("idCajaDiaria");
CREATE INDEX IF NOT EXISTS "idx_movimientos_tipo" ON "movimientosCaja"("tipo");
CREATE INDEX IF NOT EXISTS "idx_movimientos_fecha" ON "movimientosCaja"("fecha");

-- Auditoría
CREATE INDEX IF NOT EXISTS "idx_auditoria_usuario" ON "auditoria"("idUsuario");
CREATE INDEX IF NOT EXISTS "idx_auditoria_fecha" ON "auditoria"("fechaAccion");

-- ============================================
-- TABLAS CREADAS (12 en total):
-- ============================================
-- 1. usuarios - Usuarios del sistema
-- 2. clientes - Clientes del sistema
-- 3. conceptos - Conceptos de pagos
-- 4. metodosPago - Métodos de pago (Efectivo, Transferencia, Cheque)
-- 5. cajaDiaria - Control diario de caja
-- 6. auditoria - Registro de acciones
-- 7. recibos - Recibos emitidos
-- 8. reciboItems - Ítems de recibos
-- 9. pagos - Pagos de recibos
-- 10. gastos - Registro de gastos
-- 11. gastoPagos - Pagos de gastos
-- 12. movimientosCaja - Movimientos de caja
-- ============================================
