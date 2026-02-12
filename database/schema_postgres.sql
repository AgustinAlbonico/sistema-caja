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
  "fechaAlta" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "metodosPago" (
  "idMetodoPago" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(50) NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "recibos" (
  "idRecibo" SERIAL PRIMARY KEY,
  "idCliente" INT NOT NULL,
  "nroComprobante" INT NOT NULL,
  "fechaEmision" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "total" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "fkRecibosClientes" FOREIGN KEY ("idCliente") REFERENCES "clientes"("idCliente"),
  CONSTRAINT "uqRecibosNro" UNIQUE ("nroComprobante")
);

CREATE TABLE IF NOT EXISTS "reciboItems" (
  "idReciboItem" SERIAL PRIMARY KEY,
  "idRecibo" INT NOT NULL,
  "descripcion" VARCHAR(100) NOT NULL,
  "mesComprobante" INT NOT NULL,
  "anioComprobante" INT NOT NULL,
  "importe" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "fkReciboItemsRecibos" FOREIGN KEY ("idRecibo") REFERENCES "recibos"("idRecibo")
);

CREATE TABLE IF NOT EXISTS "pagos" (
  "idPago" SERIAL PRIMARY KEY,
  "idRecibo" INT NOT NULL,
  "idMetodoPago" INT NOT NULL,
  "importe" DECIMAL(18,2) NOT NULL,
  "referencia" VARCHAR(100),
  CONSTRAINT "fkPagosRecibos" FOREIGN KEY ("idRecibo") REFERENCES "recibos"("idRecibo"),
  CONSTRAINT "fkPagosMetodos" FOREIGN KEY ("idMetodoPago") REFERENCES "metodosPago"("idMetodoPago")
);

CREATE TABLE IF NOT EXISTS "gastos" (
  "idGasto" SERIAL PRIMARY KEY,
  "descripcion" VARCHAR(100),
  "importe" DECIMAL(18,2) NOT NULL,
  "fecha" DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "cajaDiaria" (
  "idCajaDiaria" SERIAL PRIMARY KEY,
  "fecha" DATE NOT NULL,
  "saldoInicial" DECIMAL(18,2) NOT NULL,
  "saldoFinal" DECIMAL(18,2),
  "cerrada" BOOLEAN NOT NULL DEFAULT FALSE,
  "fechaCierre" TIMESTAMP,
  CONSTRAINT "uqCajaDiariaFecha" UNIQUE ("fecha")
);

CREATE TABLE IF NOT EXISTS "movimientosCaja" (
  "idMovimientoCaja" SERIAL PRIMARY KEY,
  "idCajaDiaria" INT NOT NULL,
  "tipo" VARCHAR(10) NOT NULL,
  "concepto" VARCHAR(100) NOT NULL,
  "importe" DECIMAL(18,2) NOT NULL,
  "idRecibo" INT,
  "idGasto" INT,
  "idMetodoPago" INT,
  "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fkMovCajaCaja" FOREIGN KEY ("idCajaDiaria") REFERENCES "cajaDiaria"("idCajaDiaria"),
  CONSTRAINT "fkMovCajaRecibo" FOREIGN KEY ("idRecibo") REFERENCES "recibos"("idRecibo"),
  CONSTRAINT "fkMovCajaGasto" FOREIGN KEY ("idGasto") REFERENCES "gastos"("idGasto"),
  CONSTRAINT "fkMovCajaMetodo" FOREIGN KEY ("idMetodoPago") REFERENCES "metodosPago"("idMetodoPago")
);
