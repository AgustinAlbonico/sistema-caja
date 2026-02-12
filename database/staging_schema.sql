DROP TABLE IF EXISTS stg_clientes;
CREATE TABLE stg_clientes (
    id_cliente TEXT,
    nombre TEXT,
    localidad TEXT,
    direccion TEXT,
    cod_postal TEXT,
    telefono TEXT,
    cuit TEXT,
    categoria TEXT,
    provincia TEXT
);

DROP TABLE IF EXISTS stg_gastos;
CREATE TABLE stg_gastos (
    id_gasto TEXT,
    descripcion TEXT,
    importe TEXT,
    fecha TEXT
);

DROP TABLE IF EXISTS stg_recibos;
CREATE TABLE stg_recibos (
    id_recibo TEXT,
    id_cliente TEXT,
    descripcion_linea_uno TEXT,
    importe TEXT,
    mes_comprobante_linea_uno TEXT,
    anio_comprobante_linea_uno TEXT,
    fecha_emision_comprobante TEXT,
    nro_comprobante TEXT,
    descripcion_linea_dos TEXT,
    mes_comprobante_linea_dos TEXT,
    anio_comprobante_linea_dos TEXT,
    descripcion_linea_tres TEXT,
    mes_comprobante_linea_tres TEXT,
    anio_comprobante_linea_tres TEXT
);
