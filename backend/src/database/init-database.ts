import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

/**
 * Inicialización completa de la base de datos.
 * Este archivo es IDEMPOTENTE: puede ejecutarse múltiples veces sin efectos secundarios.
 *
 * Orden de ejecución:
 * 1. Crear tipos enumerados (si no existen)
 * 2. Crear tablas (respetando dependencias de FKs)
 * 3. Crear índices
 * 4. Insertar seeds (usuarios, config, métodos de pago)
 */

const INIT_TIMEOUT_MS = 30_000;

interface UsuarioSeed {
  nombreUsuario: string;
  contrasena: string;
  nombreCompleto: string;
}

const USUARIOS_SEED: readonly UsuarioSeed[] = [
  {
    nombreUsuario: 'admin',
    contrasena: 'ferchu123',
    nombreCompleto: 'Administrador del Sistema',
  },
  {
    nombreUsuario: 'sandra',
    contrasena: 'Sandra123',
    nombreCompleto: 'Sandra (Cajero)',
  },
  {
    nombreUsuario: 'fiore',
    contrasena: 'Fiore123',
    nombreCompleto: 'Fiore (Cajero)',
  },
] as const;

const METODOS_PAGO_SEED = ['Efectivo', 'Transferencia', 'Cheque'] as const;

// ─── DDL: Tablas ────────────────────────────────────────────────────────────

const DDL_TABLES = `
-- =====================================================
-- 1. USUARIOS (sin dependencias)
-- =====================================================
CREATE TABLE IF NOT EXISTS "usuarios" (
  "idUsuario"       SERIAL PRIMARY KEY,
  "nombreUsuario"   VARCHAR(100) NOT NULL UNIQUE,
  "contrasenaHash"  VARCHAR(255) NOT NULL,
  "nombreCompleto"  VARCHAR(200) NOT NULL,
  "activo"          BOOLEAN DEFAULT TRUE,
  "fechaCreacion"   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. AUDITORIA (depende de usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS "auditoria" (
  "idAuditoria"  SERIAL PRIMARY KEY,
  "idUsuario"    INTEGER NOT NULL,
  "accion"       VARCHAR(50)  NOT NULL,
  "entidad"      VARCHAR(50)  NOT NULL,
  "idEntidad"    INTEGER      NULL,
  "detalle"      TEXT         NULL,
  "fechaAccion"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_auditoria_usuario" FOREIGN KEY ("idUsuario")
    REFERENCES "usuarios"("idUsuario") ON DELETE RESTRICT
);

-- =====================================================
-- 3. CONFIG (sin dependencias)
-- =====================================================
CREATE TABLE IF NOT EXISTS "config" (
  "clave"              VARCHAR(100) PRIMARY KEY,
  "valor"              VARCHAR(255) NOT NULL,
  "descripcion"        VARCHAR(255),
  "fechaActualizacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3B. SCHEMA VERSION (sin dependencias)
-- =====================================================
CREATE TABLE IF NOT EXISTS "schemaVersion" (
  "idSchemaVersion" SERIAL PRIMARY KEY,
  "version"         VARCHAR(50) NOT NULL UNIQUE,
  "descripcion"     VARCHAR(255) NULL,
  "fechaAplicacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. CLIENTES (sin dependencias de otras tablas custom)
-- =====================================================
CREATE TABLE IF NOT EXISTS "clientes" (
  "idCliente"          SERIAL PRIMARY KEY,
  "nombre"             VARCHAR(100) NOT NULL,
  "localidad"          VARCHAR(100) NULL,
  "direccion"          VARCHAR(100) NULL,
  "codPostal"          VARCHAR(100) NULL,
  "telefono"           VARCHAR(100) NULL,
  "cuit"               VARCHAR(100) NULL,
  "categoria"          VARCHAR(100) NULL,
  "provincia"          VARCHAR(100) NULL,
  "fechaAlta"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "idUsuarioCreacion"  INTEGER NULL
);

-- =====================================================
-- 5. CONCEPTOS (sin dependencias)
-- =====================================================
CREATE TABLE IF NOT EXISTS "conceptos" (
  "idConcepto"     SERIAL PRIMARY KEY,
  "descripcion"    VARCHAR(255) NOT NULL UNIQUE,
  "activo"         BOOLEAN DEFAULT TRUE,
  "fechaCreacion"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5B. GASTO DESCRIPCIONES (sin dependencias)
-- =====================================================
CREATE TABLE IF NOT EXISTS "gasto_descripciones" (
  "idGastoDescripcion"  SERIAL PRIMARY KEY,
  "descripcion"          VARCHAR(255) NOT NULL UNIQUE,
  "activo"               BOOLEAN DEFAULT TRUE,
  "fechaCreacion"       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. METODOS DE PAGO (sin dependencias)
-- =====================================================
CREATE TABLE IF NOT EXISTS "metodosPago" (
  "idMetodoPago"  SERIAL PRIMARY KEY,
  "nombre"        VARCHAR(50) NOT NULL,
  "activo"        BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 7. RECIBOS (depende de clientes, usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS "recibos" (
  "idRecibo"           SERIAL PRIMARY KEY,
  "idCliente"          INTEGER NOT NULL,
  "nroComprobante"     INTEGER NOT NULL,
  "fechaEmision"       TIMESTAMP NOT NULL,
  "total"              NUMERIC(18,2) NOT NULL,
  "idUsuarioCreacion"  INTEGER NULL,
  CONSTRAINT "uqRecibosNro" UNIQUE ("nroComprobante"),
  CONSTRAINT "fk_recibos_cliente" FOREIGN KEY ("idCliente")
    REFERENCES "clientes"("idCliente") ON DELETE RESTRICT,
  CONSTRAINT "fk_recibos_usuario_creacion" FOREIGN KEY ("idUsuarioCreacion")
    REFERENCES "usuarios"("idUsuario") ON DELETE SET NULL
);

-- =====================================================
-- 8. RECIBO ITEMS (depende de recibos)
-- =====================================================
CREATE TABLE IF NOT EXISTS "reciboItems" (
  "idReciboItem"     SERIAL PRIMARY KEY,
  "idRecibo"         INTEGER NOT NULL,
  "descripcion"      VARCHAR(100) NOT NULL,
  "mesComprobante"   INTEGER NOT NULL,
  "anioComprobante"  INTEGER NOT NULL,
  "importe"          NUMERIC(18,2) NOT NULL,
  CONSTRAINT "fk_recibo_items_recibo" FOREIGN KEY ("idRecibo")
    REFERENCES "recibos"("idRecibo") ON DELETE CASCADE
);

-- =====================================================
-- 9. PAGOS (depende de recibos, metodosPago)
-- =====================================================
CREATE TABLE IF NOT EXISTS "pagos" (
  "idPago"        SERIAL PRIMARY KEY,
  "idRecibo"      INTEGER NOT NULL,
  "idMetodoPago"  INTEGER NOT NULL,
  "importe"       NUMERIC(18,2) NOT NULL,
  "referencia"    VARCHAR(100) NULL,
  CONSTRAINT "fk_pagos_recibo" FOREIGN KEY ("idRecibo")
    REFERENCES "recibos"("idRecibo") ON DELETE CASCADE,
  CONSTRAINT "fk_pagos_metodo" FOREIGN KEY ("idMetodoPago")
    REFERENCES "metodosPago"("idMetodoPago") ON DELETE RESTRICT
);

-- =====================================================
-- 10. GASTOS (sin dependencias de FK obligatoria)
-- =====================================================
CREATE TABLE IF NOT EXISTS "gastos" (
  "idGasto"            SERIAL PRIMARY KEY,
  "descripcion"        VARCHAR(100) NULL,
  "importe"            NUMERIC(18,2) NOT NULL,
  "fecha"              DATE NOT NULL,
  "createdAt"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "idUsuarioCreacion"  INTEGER NULL
);

-- =====================================================
-- 11. GASTO PAGOS (depende de gastos, metodosPago)
-- =====================================================
CREATE TABLE IF NOT EXISTS "gastoPagos" (
  "idGastoPago"   SERIAL PRIMARY KEY,
  "idGasto"       INTEGER NOT NULL,
  "idMetodoPago"  INTEGER NOT NULL,
  "importe"       NUMERIC(18,2) NOT NULL,
  "referencia"    VARCHAR(100) NULL,
  CONSTRAINT "fk_gasto_pago_gasto" FOREIGN KEY ("idGasto")
    REFERENCES "gastos"("idGasto") ON DELETE CASCADE,
  CONSTRAINT "fk_gasto_pago_metodo" FOREIGN KEY ("idMetodoPago")
    REFERENCES "metodosPago"("idMetodoPago") ON DELETE RESTRICT
);

-- =====================================================
-- 12. CAJA DIARIA (depende de usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS "cajaDiaria" (
  "idCajaDiaria"       SERIAL PRIMARY KEY,
  "fecha"              DATE NOT NULL,
  "saldoInicial"       NUMERIC(18,2) NOT NULL,
  "saldoFinal"         NUMERIC(18,2) NULL,
  "cerrada"            BOOLEAN DEFAULT FALSE,
  "fechaCierre"        TIMESTAMP NULL,
  "idUsuarioApertura"  INTEGER NULL,
  "idUsuarioCierre"    INTEGER NULL,
  CONSTRAINT "uqCajaDiariaFecha" UNIQUE ("fecha"),
  CONSTRAINT "fk_caja_usuario_apertura" FOREIGN KEY ("idUsuarioApertura")
    REFERENCES "usuarios"("idUsuario") ON DELETE SET NULL,
  CONSTRAINT "fk_caja_usuario_cierre" FOREIGN KEY ("idUsuarioCierre")
    REFERENCES "usuarios"("idUsuario") ON DELETE SET NULL
);

-- =====================================================
-- 13. MOVIMIENTOS CAJA (depende de cajaDiaria, recibos, gastos, metodosPago)
-- =====================================================
CREATE TABLE IF NOT EXISTS "movimientosCaja" (
  "idMovimientoCaja"  SERIAL PRIMARY KEY,
  "idCajaDiaria"      INTEGER NOT NULL,
  "tipo"              VARCHAR(20) NOT NULL,
  "concepto"          VARCHAR(100) NOT NULL,
  "importe"           NUMERIC(18,2) NOT NULL,
  "idRecibo"          INTEGER NULL,
  "idGasto"           INTEGER NULL,
  "idMetodoPago"      INTEGER NULL,
  "fecha"             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_movimientos_caja" FOREIGN KEY ("idCajaDiaria")
    REFERENCES "cajaDiaria"("idCajaDiaria") ON DELETE RESTRICT,
  CONSTRAINT "fk_movimientos_recibo" FOREIGN KEY ("idRecibo")
    REFERENCES "recibos"("idRecibo") ON DELETE SET NULL,
  CONSTRAINT "fk_movimientos_gasto" FOREIGN KEY ("idGasto")
    REFERENCES "gastos"("idGasto") ON DELETE SET NULL,
  CONSTRAINT "fk_movimientos_metodo" FOREIGN KEY ("idMetodoPago")
    REFERENCES "metodosPago"("idMetodoPago") ON DELETE SET NULL
);
`;

// ─── DDL: Índices ───────────────────────────────────────────────────────────

const DDL_INDEXES = `
-- Usuarios
CREATE INDEX IF NOT EXISTS "idx_usuarios_nombreUsuario" ON "usuarios"("nombreUsuario");
CREATE INDEX IF NOT EXISTS "idx_usuarios_activo"        ON "usuarios"("activo");

-- Auditoria
CREATE INDEX IF NOT EXISTS "idx_auditoria_idUsuario"    ON "auditoria"("idUsuario");
CREATE INDEX IF NOT EXISTS "idx_auditoria_entidad"      ON "auditoria"("entidad");
CREATE INDEX IF NOT EXISTS "idx_auditoria_accion"       ON "auditoria"("accion");
CREATE INDEX IF NOT EXISTS "idx_auditoria_fechaAccion"  ON "auditoria"("fechaAccion");
CREATE INDEX IF NOT EXISTS "idx_auditoria_idEntidad"    ON "auditoria"("idEntidad");

-- Config
CREATE INDEX IF NOT EXISTS "idx_config_clave" ON "config"("clave");

-- Clientes
CREATE INDEX IF NOT EXISTS "idx_clientes_nombre" ON "clientes"("nombre");

-- Conceptos
CREATE INDEX IF NOT EXISTS "idx_conceptos_activo" ON "conceptos"("activo");

-- Gasto Descripciones
CREATE INDEX IF NOT EXISTS "idx_gasto_descripciones_activo" ON "gasto_descripciones"("activo");

-- Recibos
CREATE INDEX IF NOT EXISTS "idx_recibos_idCliente"      ON "recibos"("idCliente");
CREATE INDEX IF NOT EXISTS "idx_recibos_fechaEmision"    ON "recibos"("fechaEmision");
CREATE INDEX IF NOT EXISTS "idx_recibos_nroComprobante"  ON "recibos"("nroComprobante");

-- Recibo Items
CREATE INDEX IF NOT EXISTS "idx_recibo_items_idRecibo" ON "reciboItems"("idRecibo");

-- Pagos
CREATE INDEX IF NOT EXISTS "idx_pagos_idRecibo"     ON "pagos"("idRecibo");
CREATE INDEX IF NOT EXISTS "idx_pagos_idMetodoPago" ON "pagos"("idMetodoPago");

-- Gastos
CREATE INDEX IF NOT EXISTS "idx_gastos_fecha" ON "gastos"("fecha");

-- Gasto Pagos
CREATE INDEX IF NOT EXISTS "idx_gasto_pagos_gasto"  ON "gastoPagos"("idGasto");
CREATE INDEX IF NOT EXISTS "idx_gasto_pagos_metodo" ON "gastoPagos"("idMetodoPago");

-- Caja Diaria
CREATE INDEX IF NOT EXISTS "idx_caja_diaria_fecha" ON "cajaDiaria"("fecha");

-- Movimientos Caja
CREATE INDEX IF NOT EXISTS "idx_movimientos_idCajaDiaria" ON "movimientosCaja"("idCajaDiaria");
CREATE INDEX IF NOT EXISTS "idx_movimientos_idRecibo"     ON "movimientosCaja"("idRecibo");
CREATE INDEX IF NOT EXISTS "idx_movimientos_idGasto"      ON "movimientosCaja"("idGasto");
CREATE INDEX IF NOT EXISTS "idx_movimientos_tipo"         ON "movimientosCaja"("tipo");
CREATE INDEX IF NOT EXISTS "idx_movimientos_fecha"        ON "movimientosCaja"("fecha");
`;

// ─── Seeds (solo se ejecutan la primera vez) ──────────────────────────────

async function seedUsuarios(ds: DataSource): Promise<void> {
  for (const user of USUARIOS_SEED) {
    const hash = await bcrypt.hash(user.contrasena, 10);
    await ds.query(
      `INSERT INTO "usuarios" ("nombreUsuario", "contrasenaHash", "nombreCompleto", "activo")
             VALUES ($1, $2, $3, TRUE)`,
      [user.nombreUsuario, hash, user.nombreCompleto],
    );
    console.log(`  ✓ Usuario '${user.nombreUsuario}' creado`);
  }
}

async function seedConfig(ds: DataSource): Promise<void> {
  await ds.query(
    `INSERT INTO "config" ("clave", "valor", "descripcion")
         VALUES ('ultimoNroRecibo', '0', 'Último número de comprobante de recibo usado')`,
  );
  console.log('  ✓ Configuración inicial creada');
}

async function seedSchemaVersion(ds: DataSource): Promise<void> {
  await ds.query(
    `INSERT INTO "schemaVersion" ("version", "descripcion")
         VALUES ('1.0.0', 'Schema inicial del sistema')`,
  );
  console.log('  ✓ Schema version 1.0.0 registrado');
}

async function seedMetodosPago(ds: DataSource): Promise<void> {
  for (const nombre of METODOS_PAGO_SEED) {
    await ds.query(
      `INSERT INTO "metodosPago" ("nombre", "activo") VALUES ($1, TRUE)`,
      [nombre],
    );
    console.log(`  ✓ Método de pago '${nombre}' creado`);
  }
}

async function markAsInitialized(ds: DataSource): Promise<void> {
  await ds.query(
    `INSERT INTO "config" ("clave", "valor", "descripcion")
         VALUES ('db_initialized', 'true', 'Marca de que la BD fue inicializada')`,
  );
}

// ─── Verificación de estado ─────────────────────────────────────────────────

async function isAlreadyInitialized(ds: DataSource): Promise<boolean> {
  try {
    // Verificar si la tabla config existe y tiene la marca de inicialización
    const result = await ds.query(
      `SELECT 1 FROM "config" WHERE "clave" = 'db_initialized' LIMIT 1`,
    );
    return result.length > 0;
  } catch {
    // Si la tabla config no existe, es la primera vez
    return false;
  }
}

// ─── Ejecución principal ────────────────────────────────────────────────────

export async function initializeDatabase(ds: DataSource): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Timeout: inicialización de BD excedió los 30s')),
      INIT_TIMEOUT_MS,
    ),
  );

  const initPromise = async () => {
    // Verificar si ya fue inicializada
    if (await isAlreadyInitialized(ds)) {
      console.log('✓ Base de datos ya inicializada');
      return;
    }

    console.log('\n🔧 Primera ejecución: inicializando base de datos...');

    // 1. Crear tablas
    console.log('\n📦 Creando tablas...');
    await ds.query(DDL_TABLES);
    console.log('  ✓ Tablas creadas');

    // 2. Crear índices
    console.log('\n📇 Creando índices...');
    await ds.query(DDL_INDEXES);
    console.log('  ✓ Índices creados');

    // 3. Seeds
    console.log('\n🌱 Cargando datos iniciales...');
    await seedUsuarios(ds);
    await seedConfig(ds);
    await seedSchemaVersion(ds);
    await seedMetodosPago(ds);

    // 4. Marcar como inicializada
    await markAsInitialized(ds);

    console.log('\n✅ Base de datos inicializada correctamente');

    // Mostrar credenciales
    console.log('\n=== USUARIOS CREADOS ===');
    for (const user of USUARIOS_SEED) {
      console.log(
        `  Usuario: ${user.nombreUsuario} | Contraseña: ${user.contrasena}`,
      );
    }
    console.log('========================\n');
  };

  await Promise.race([initPromise(), timeoutPromise]);
}
