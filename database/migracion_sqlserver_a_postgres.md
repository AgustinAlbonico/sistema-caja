# Migracion de SQL Server a PostgreSQL

## Objetivo
Migrar los datos de `db_sistema_recibos` (SQL Server) a la nueva estructura en PostgreSQL manteniendo los datos existentes y agregando soporte de multiples metodos de pago y caja diaria.

## Estrategia recomendada
1. Crear las tablas nuevas en PostgreSQL usando `database/schema_postgres.sql`.
2. Exportar tablas de SQL Server a CSV (una por tabla) respetando codificacion UTF-8.
3. Importar CSV en PostgreSQL y luego ejecutar scripts de transformacion para poblar las nuevas tablas relacionadas.
4. Validar conteos y totales (clientes, recibos, gastos, importes por fecha).

## Exportacion (SQL Server)
Ejemplo con `bcp` (ajustar rutas y credenciales):

```sql
-- En SQL Server, exportar a CSV usando bcp en PowerShell
-- bcp "SELECT * FROM db_sistema_recibos.dbo.clientes" queryout "C:\migracion\clientes.csv" -c -t, -T -S localhost\SQLEXPRESS
```

## Importacion (PostgreSQL)
Ejemplo con `COPY`:

```sql
\copy "clientes"("idCliente","nombre","localidad","direccion","codPostal","telefono","cuit","categoria","provincia")
FROM 'C:/migracion/clientes.csv' DELIMITER ',' CSV HEADER;
```

## Transformaciones clave

### 1) Recibos base
Insertar recibos con total desde la tabla original.

```sql
INSERT INTO "recibos" ("idRecibo", "idCliente", "nroComprobante", "fechaEmision", "total")
SELECT r.id_recibo, r.id_cliente, r.nro_comprobante, r.fecha_emision_comprobante, r.importe
FROM recibos r;
```

### 2) Lineas del recibo
Separar lineas en `reciboItems`.

```sql
INSERT INTO "reciboItems" ("idRecibo", "descripcion", "mesComprobante", "anioComprobante", "importe")
SELECT r.id_recibo, r.descripcion_linea_uno, r.mes_comprobante_linea_uno, r.anio_comprobante_linea_uno, r.importe
FROM recibos r
UNION ALL
SELECT r.id_recibo, r.descripcion_linea_dos, r.mes_comprobante_linea_dos, r.anio_comprobante_linea_dos, 0
FROM recibos r
WHERE r.descripcion_linea_dos IS NOT NULL
UNION ALL
SELECT r.id_recibo, r.descripcion_linea_tres, r.mes_comprobante_linea_tres, r.anio_comprobante_linea_tres, 0
FROM recibos r
WHERE r.descripcion_linea_tres IS NOT NULL;
```

### 3) Metodo de pago por defecto
Crear un metodo por defecto e insertar pagos 100% efectivos por recibo.

```sql
INSERT INTO "metodosPago" ("nombre", "activo") VALUES ('Efectivo', TRUE);

INSERT INTO "pagos" ("idRecibo", "idMetodoPago", "importe")
SELECT r."idRecibo", mp."idMetodoPago", r."total"
FROM "recibos" r
CROSS JOIN (SELECT "idMetodoPago" FROM "metodosPago" WHERE "nombre" = 'Efectivo' LIMIT 1) mp;
```

### 4) Caja diaria y movimientos
Crear caja diaria por fecha y registrar ingresos/egresos desde recibos y gastos.

```sql
INSERT INTO "cajaDiaria" ("fecha", "saldoInicial")
SELECT DISTINCT DATE(r."fechaEmision"), 0
FROM "recibos" r;

INSERT INTO "movimientosCaja" ("idCajaDiaria", "tipo", "concepto", "importe", "idRecibo", "idMetodoPago")
SELECT c."idCajaDiaria", 'ingreso', 'Recibo ' || r."nroComprobante", r."total", r."idRecibo", p."idMetodoPago"
FROM "recibos" r
JOIN "pagos" p ON p."idRecibo" = r."idRecibo"
JOIN "cajaDiaria" c ON c."fecha" = DATE(r."fechaEmision");

INSERT INTO "movimientosCaja" ("idCajaDiaria", "tipo", "concepto", "importe", "idGasto")
SELECT c."idCajaDiaria", 'egreso', COALESCE(g."descripcion", 'Gasto'), g."importe", g."idGasto"
FROM "gastos" g
JOIN "cajaDiaria" c ON c."fecha" = g."fecha";
```

## Validaciones post-migracion
- Contar registros: clientes, recibos, gastos.
- Sumar importes por fecha y comparar con SQL Server.
- Verificar que cada recibo tenga al menos un item y un pago.
