-- Limpiar tablas destino
TRUNCATE TABLE "movimientosCaja" CASCADE;
TRUNCATE TABLE "pagos" CASCADE;
TRUNCATE TABLE "reciboItems" CASCADE;
TRUNCATE TABLE "recibos" CASCADE;
TRUNCATE TABLE "metodosPago" CASCADE;
TRUNCATE TABLE "gastos" CASCADE;
TRUNCATE TABLE "cajaDiaria" CASCADE;
TRUNCATE TABLE "clientes" CASCADE;

-- Helper paramanejars vacios en numericos
-- CAST(NULLIF(x, '') AS TYPE)

-- 1. Clientes
INSERT INTO "clientes" ("idCliente", "nombre", "localidad", "direccion", "codPostal", "telefono", "cuit", "categoria", "provincia")
SELECT 
    CAST(NULLIF(id_cliente, '') AS INT), 
    nombre, localidad, direccion, cod_postal, telefono, cuit, categoria, provincia
FROM stg_clientes;

-- Actualizar secuencia clientes
SELECT setval(pg_get_serial_sequence('"clientes"', 'idCliente'), (SELECT MAX("idCliente") FROM "clientes"));

-- 2. Metodos Pago Default
INSERT INTO "metodosPago" ("nombre", "activo") VALUES ('Efectivo', TRUE);
INSERT INTO "metodosPago" ("nombre", "activo") VALUES ('Transferencia', TRUE);

-- 3. Recibos Cabecera
INSERT INTO "recibos" ("idRecibo", "idCliente", "nroComprobante", "fechaEmision", "total")
SELECT 
    CAST(NULLIF(id_recibo, '') AS INT),
    CAST(NULLIF(id_cliente, '') AS INT),
    CAST(NULLIF(nro_comprobante, '') AS INT),
    CAST(NULLIF(fecha_emision_comprobante, '') AS TIMESTAMP),
    CAST(NULLIF(importe, '') AS DECIMAL(18,2))
FROM stg_recibos;

-- Actualizar secuencia recibos
SELECT setval(pg_get_serial_sequence('"recibos"', 'idRecibo'), (SELECT MAX("idRecibo") FROM "recibos"));

-- 4. Recibo Items (Normalizar lineas)
-- Linea 1
INSERT INTO "reciboItems" ("idRecibo", "descripcion", "mesComprobante", "anioComprobante", "importe")
SELECT 
    CAST(NULLIF(id_recibo, '') AS INT),
    descripcion_linea_uno, 
    CAST(NULLIF(mes_comprobante_linea_uno, '') AS INT),
    CAST(NULLIF(anio_comprobante_linea_uno, '') AS INT),
    CAST(NULLIF(importe, '') AS DECIMAL(18,2))
FROM stg_recibos
WHERE descripcion_linea_uno IS NOT NULL AND descripcion_linea_uno <> '';

-- Linea 2
INSERT INTO "reciboItems" ("idRecibo", "descripcion", "mesComprobante", "anioComprobante", "importe")
SELECT 
    CAST(NULLIF(id_recibo, '') AS INT),
    descripcion_linea_dos, 
    COALESCE(CAST(NULLIF(mes_comprobante_linea_dos, '') AS INT), 0),
    COALESCE(CAST(NULLIF(anio_comprobante_linea_dos, '') AS INT), 0),
    0
FROM stg_recibos
WHERE descripcion_linea_dos IS NOT NULL AND descripcion_linea_dos <> '';

-- Linea 3
INSERT INTO "reciboItems" ("idRecibo", "descripcion", "mesComprobante", "anioComprobante", "importe")
SELECT 
    CAST(NULLIF(id_recibo, '') AS INT),
    descripcion_linea_tres, 
    COALESCE(CAST(NULLIF(mes_comprobante_linea_tres, '') AS INT), 0),
    COALESCE(CAST(NULLIF(anio_comprobante_linea_tres, '') AS INT), 0),
    0
FROM stg_recibos
WHERE descripcion_linea_tres IS NOT NULL AND descripcion_linea_tres <> '';

-- 5. Pagos (Asumir 100% Efectivo por defecto para migración inicial)
INSERT INTO "pagos" ("idRecibo", "idMetodoPago", "importe")
SELECT r."idRecibo", mp."idMetodoPago", r."total"
FROM "recibos" r
CROSS JOIN (SELECT "idMetodoPago" FROM "metodosPago" WHERE "nombre" = 'Efectivo' LIMIT 1) mp;

-- 6. Gastos
INSERT INTO "gastos" ("idGasto", "descripcion", "importe", "fecha")
SELECT 
    CAST(NULLIF(id_gasto, '') AS INT),
    descripcion, 
    CAST(NULLIF(importe, '') AS DECIMAL(18,2)), 
    CAST(NULLIF(fecha, '') AS DATE)
FROM stg_gastos;

-- Actualizar secuencia gastos
SELECT setval(pg_get_serial_sequence('"gastos"', 'idGasto'), (SELECT MAX("idGasto") FROM "gastos"));

-- 7. Caja Diaria (Reconstrucción Histórica)
-- Crear cajas para todas las fechas donde hubo recibos o gastos
INSERT INTO "cajaDiaria" ("fecha", "saldoInicial", "cerrada")
SELECT DISTINCT DATE(fecha), 0, TRUE
FROM (
    SELECT "fechaEmision" as fecha FROM "recibos"
    UNION
    SELECT "fecha" as fecha FROM "gastos"
) fechas;

-- 8. Movimientos Caja
-- Ingresos por Recibos
INSERT INTO "movimientosCaja" ("idCajaDiaria", "tipo", "concepto", "importe", "idRecibo", "idMetodoPago", "fecha")
SELECT c."idCajaDiaria", 'Ingreso', 'Recibo Nro ' || r."nroComprobante", r."total", r."idRecibo", p."idMetodoPago", r."fechaEmision"
FROM "recibos" r
JOIN "pagos" p ON p."idRecibo" = r."idRecibo"
JOIN "cajaDiaria" c ON c."fecha" = DATE(r."fechaEmision");

-- Egresos por Gastos
INSERT INTO "movimientosCaja" ("idCajaDiaria", "tipo", "concepto", "importe", "idGasto", "fecha")
SELECT c."idCajaDiaria", 'Egreso', g."descripcion", g."importe", g."idGasto", CAST(g."fecha" AS TIMESTAMP)
FROM "gastos" g
JOIN "cajaDiaria" c ON c."fecha" = g."fecha";

-- Calcular Saldos Finales de Cajas (Update masivo)
UPDATE "cajaDiaria" c
SET "saldoFinal" = (
    SELECT COALESCE(SUM(CASE WHEN m.tipo = 'Ingreso' THEN m.importe ELSE -m.importe END), 0)
    FROM "movimientosCaja" m
    WHERE m."idCajaDiaria" = c."idCajaDiaria"
);
