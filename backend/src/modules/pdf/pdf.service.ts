import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  InternalServerErrorException,
} from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { Recibo } from '../../database/entities/recibo.entity';
import { CajaDiaria } from '../../database/entities/caja-diaria.entity';

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser | null = null;

  async onModuleInit() {
    await this.initBrowser();
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async initBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
    }
  }

  async generarReciboPdf(recibo: Recibo): Promise<Buffer> {
    try {
      await this.initBrowser();

      if (!this.browser) {
        throw new Error('No se pudo inicializar el navegador');
      }

      const html = this.generarHtmlCompleto(recibo);
      const page = await this.browser.newPage();

      try {
        // Usamos 'load' para ser más rápidos que 'networkidle0', asumiendo que las fuentes se cargan rápido o están cacheadas
        await page.setContent(html, { waitUntil: 'load' });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        });

        return Buffer.from(pdfBuffer);
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error('Error al generar PDF del recibo:', error);
      // Intentar recuperar el navegador si murió
      if (this.browser && !this.browser.isConnected()) {
        try {
          await this.browser.close();
        } catch (e) {}
        this.browser = null;
      }
      throw new InternalServerErrorException(
        'Error al generar el PDF del recibo',
      );
    }
  }

  async generarCajaPdf(
    fecha: string,
    caja: CajaDiaria,
    movimientos: any[],
    ingresos: string,
    egresos: string,
    saldoFinal: string,
  ): Promise<Buffer> {
    try {
      await this.initBrowser();

      if (!this.browser) {
        throw new Error('No se pudo inicializar el navegador');
      }

      const html = this.generarCajaHtml(
        fecha,
        caja,
        movimientos,
        ingresos,
        egresos,
        saldoFinal,
      );
      const page = await this.browser.newPage();

      try {
        await page.setContent(html, { waitUntil: 'load' });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });

        return Buffer.from(pdfBuffer);
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error('Error al generar PDF de la caja:', error);
      // Intentar recuperar el navegador si murió
      if (this.browser && !this.browser.isConnected()) {
        try {
          await this.browser.close();
        } catch (e) {}
        this.browser = null;
      }
      throw new InternalServerErrorException(
        'Error al generar el PDF de la caja',
      );
    }
  }

  private generarHtmlCompleto(recibo: Recibo): string {
    const htmlOriginal = this.generarReciboHtml(recibo, 'ORIGINAL');
    const htmlDuplicado = this.generarReciboHtml(recibo, 'DUPLICADO');

    return `<!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recibo de Cobro</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Source Sans 3', sans-serif; width: 210mm; height: 297mm; margin: 0 auto; background: white; color: #000; }
          .recibo { width: 100%; height: 148.5mm; padding: 10mm 14mm; border-bottom: 1px dashed #000; position: relative; }
          .recibo:last-child { border-bottom: none; }
          .recibo::before { content: ''; position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; border: 0.5px solid #e5e5e5; pointer-events: none; }
          .header { display: grid; grid-template-columns: auto 1fr; gap: 30px; margin-bottom: 4px; padding-bottom: 15px; border-bottom: 1px solid #000; }
          .logo { padding: 12px 20px; text-align: center; position: relative; border: 1px solid #000; }
          .logo h1 { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 600; margin-bottom: 0; line-height: 1.15; letter-spacing: 4px; color: #000; }
          .logo h2 { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 500; line-height: 1; margin-top: 4px; letter-spacing: 3px; color: #000; }
          .info-derecha { display: flex; flex-direction: column; justify-content: center; padding-left: 15px; }
          .titulo { font-family: 'Playfair Display', serif; font-weight: 600; font-size: 10px; margin-bottom: 12px; text-align: right; letter-spacing: 2.5px; text-transform: uppercase; }
          .numero, .fecha { font-size: 11px; margin-bottom: 4px; text-align: right; font-weight: 400; color: #333; }
          .numero span, .fecha span { font-weight: 600; color: #000; }
          .datos-estudio { margin-top: 4px; padding-top: 0; border-top: none; text-align: right; }
          .datos-estudio p { font-size: 9px; margin-bottom: 2px; line-height: 1.4; font-weight: 300; color: #333; }
          .datos-cliente { margin: 2px 0; padding: 2px 0; border-top: 0.5px solid #e5e5e5; border-bottom: 0.5px solid #e5e5e5; display: flex; justify-content: space-between; align-items: center; }
          .cliente-izquierda, .cuit-derecha { font-size: 11px; font-weight: 300; color: #333; margin: 0; }
          .concepto { margin: 2px 0 0 0; padding: 0; }
          .concepto-header { font-family: 'Playfair Display', serif; font-size: 10px; font-weight: 600; margin-bottom: 0; padding-bottom: 8px; border-bottom: 1px solid #000; letter-spacing: 2px; text-transform: uppercase; }
          .concepto-table { width: 100%; border-collapse: collapse; }
          .concepto-table th { font-family: 'Playfair Display', serif; font-size: 9px; font-weight: 600; text-align: left; padding: 8px 4px; border-bottom: 1px solid #000; letter-spacing: 1px; text-transform: uppercase; }
          .concepto-table th:nth-child(3) { text-align: right; }
          .concepto-table td { font-size: 11px; padding: 4px 4px; border-bottom: 0.5px solid #e5e5e5; font-weight: 300; color: #333; }
          .concepto-table td:nth-child(3) { text-align: right; font-weight: 500; }
          .concepto-table tr:last-child td { border-bottom: none; }
          .metodos-pago { margin: 15px 0 30px 0; width: 100%; }
          .metodos-pago-header { font-family: 'Playfair Display', serif; font-size: 10px; font-weight: 600; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #000; letter-spacing: 2px; text-transform: uppercase; }
          .metodos-pago-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; width: 100%; gap: 20px; }
          .metodo-pago-item { display: flex; flex-direction: column; }
          .metodo-pago-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; color: #000; }
          .metodo-pago-valor { font-size: 11px; font-weight: 500; color: #333; }
          .cheques-container { margin-top: 2px; display: flex; flex-direction: column; gap: 1px; }
          .cheque-item { font-size: 8px; color: #666; }
          .firma-section { position: absolute; bottom: 15mm; right: 14mm; }
          .firma-box { position: relative; border-top: 1px solid #000; padding-top: 8px; width: 220px; text-align: center; }
          .firma-box p { font-size: 8px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #000; }
          .sello { position: absolute; top: -70px; right: 10px; width: 50px; height: 50px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(-12deg); opacity: 0.4; }
          .sello span { font-family: 'Playfair Display', serif; font-size: 8px; font-weight: 700; text-align: center; line-height: 1.1; letter-spacing: 0.5px; }
          @media print { body { margin: 0; } .recibo { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        ${htmlOriginal}
        ${htmlDuplicado}
      </body>
      </html>`;
  }

  private generarReciboHtml(
    recibo: Recibo,
    tipo: 'ORIGINAL' | 'DUPLICADO',
  ): string {
    const nroComprobante = this.formatearNroComprobante(recibo.nroComprobante);
    const fecha = this.formatearFecha(recibo.fechaEmision);
    const nombreCliente =
      tipo === 'ORIGINAL'
        ? recibo.cliente?.nombre || ''
        : `${recibo.cliente?.idCliente || ''}.003 ${recibo.cliente?.nombre || ''}`;
    const cuit = recibo.cliente?.cuit || '';

    const filasConceptos = recibo.items
      .map((item) => {
        const periodo = `${String(item.mesComprobante).padStart(2, '0')}/${item.anioComprobante}`;
        const importe = this.formatearImporte(item.importe);
        return `<tr><td>${periodo}</td><td>${item.descripcion.toUpperCase()}</td><td>${importe}</td></tr>`;
      })
      .join('');

    const metodosPago = this.generarMetodosPagoHtml(recibo);

    return `<div class="recibo">
      <div class="header">
        <div class="logo">
          <h1>ESTUDIO</h1>
          <h1>CONTABLE</h1>
          <h2>ALBÓNICO</h2>
        </div>
        <div class="info-derecha">
          <p class="titulo">Recibo de Cobro — ${tipo === 'ORIGINAL' ? 'Original' : 'Duplicado'}</p>
          <p class="numero">Número: <span>0001 - ${nroComprobante}</span></p>
          <p class="fecha">Fecha: <span>${fecha}</span></p>
          <div class="datos-estudio">
            <p>San Martín 434</p>
            <p>2503 Villa Eloísa (Sta. Fe)</p>
            <p>Tel.: 03471-491404</p>
          </div>
        </div>
      </div>

      <div class="datos-cliente">
        <p class="cliente-izquierda"><strong>Cliente:</strong> ${nombreCliente}</p>
        <p class="cuit-derecha"><strong>CUIT:</strong> ${cuit}</p>
      </div>

      <div class="concepto">
        <p class="concepto-header">CONCEPTO</p>
        <table class="concepto-table">
          <thead>
            <tr>
              <th style="width: 18%;">Periodo</th>
              <th style="width: 62%;">Concepto</th>
              <th style="width: 20%;">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${filasConceptos}
          </tbody>
        </table>
      </div>

      <div class="metodos-pago">
        <p class="metodos-pago-header">FORMAS DE PAGO</p>
        <div class="metodos-pago-grid">
          ${metodosPago}
        </div>
      </div>

      <div class="firma-section">
        <div class="firma-box">
          <div class="sello">
            <span>${tipo}</span>
          </div>
          <p>FIRMA ESTUDIO CONTABLE ALBÓNICO</p>
        </div>
      </div>
    </div>`;
  }

  private generarMetodosPagoHtml(recibo: Recibo): string {
    const pagosPorMetodo: Record<
      number,
      { importe: number; cheques: string[]; nombre: string }
    > = {};

    recibo.pagos.forEach((pago) => {
      if (!pagosPorMetodo[pago.idMetodoPago]) {
        pagosPorMetodo[pago.idMetodoPago] = {
          importe: 0,
          cheques: [],
          nombre: pago.metodoPago?.nombre || 'Otro',
        };
      }
      pagosPorMetodo[pago.idMetodoPago].importe += Number(pago.importe);

      if (pago.numerosCheque && pago.numerosCheque.trim() !== '') {
        const cheques = pago.numerosCheque
          .split(',')
          .map((n) => n.trim())
          .filter((n) => n !== '');
        pagosPorMetodo[pago.idMetodoPago].cheques.push(...cheques);
      }
    });

    let html = '';
    for (const datos of Object.values(pagosPorMetodo)) {
      if (datos.importe > 0) {
        const importe = this.formatearImporte(datos.importe.toFixed(2));
        let chequesHtml = '';
        if (datos.cheques.length > 0) {
          chequesHtml = `<div class="cheques-container">${datos.cheques.map((n) => `<span class="cheque-item">Nº ${n}</span>`).join('')}</div>`;
        }
        html += `<div class="metodo-pago-item"><span class="metodo-pago-label">${datos.nombre.toUpperCase()}</span><span class="metodo-pago-valor">${importe}</span>${chequesHtml}</div>`;
      }
    }

    return (
      html ||
      '<div class="metodo-pago-item"><span class="metodo-pago-label">&nbsp;</span><span class="metodo-pago-valor">&nbsp;</span></div>'
    );
  }

  private formatearFecha(fecha: Date | string): string {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  private formatearNroComprobante(nro: number): string {
    return String(nro).padStart(8, '0');
  }

  private formatearImporte(importe: string | number): string {
    const num = Number(importe);
    return `$ ${num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private generarCajaHtml(
    fecha: string,
    caja: CajaDiaria,
    movimientos: any[],
    ingresos: string,
    egresos: string,
    saldoFinal: string,
  ): string {
    const fechaFormateada = this.formatearFecha(fecha);
    const fechaCierre = caja.fechaCierre
      ? this.formatearFechaHora(caja.fechaCierre)
      : '-';
    const estado = caja.cerrada ? 'CERRADA' : 'ABIERTA';
    const estadoClass = caja.cerrada ? 'cerrada' : 'abierta';

    // Calcular resumen por método de pago (solo ingresos)
    const resumenPorMetodo: Record<
      string,
      { ingresos: number; egresos: number; nombre: string }
    > = {};
    movimientos.forEach((mov) => {
      const metodoNombre = mov.metodoPago?.nombre || 'Sin definir';
      if (!resumenPorMetodo[metodoNombre]) {
        resumenPorMetodo[metodoNombre] = {
          ingresos: 0,
          egresos: 0,
          nombre: metodoNombre,
        };
      }
      if (mov.tipo === 'ingreso') {
        resumenPorMetodo[metodoNombre].ingresos += Number(mov.importe);
      } else {
        resumenPorMetodo[metodoNombre].egresos += Number(mov.importe);
      }
    });

    const filasResumenMetodos = Object.values(resumenPorMetodo)
      .filter((r) => r.ingresos > 0 || r.egresos > 0)
      .map((r) => {
        const ingresos = this.formatearImporte(r.ingresos);
        const egresos = this.formatearImporte(r.egresos);
        const neto = r.ingresos - r.egresos;
        const netoFormateado = this.formatearImporte(neto);
        return `
          <tr>
            <td class="metodo-nombre">${r.nombre.toUpperCase()}</td>
            <td class="metodo-ingresos">${ingresos}</td>
            <td class="metodo-egresos">${egresos}</td>
            <td class="metodo-neto ${neto >= 0 ? 'positivo' : 'negativo'}">${netoFormateado}</td>
          </tr>
        `;
      })
      .join('');

    // Calcular totales
    const totalIngresos = movimientos
      .filter((m) => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + Number(m.importe), 0);

    const totalEgresos = movimientos
      .filter((m) => m.tipo === 'egreso')
      .reduce((sum, m) => sum + Number(m.importe), 0);

    const filasMovimientos = movimientos
      .map((mov) => {
        const hora = this.formatearHora(mov.fecha);
        const tipoClass = mov.tipo === 'ingreso' ? 'ingreso' : 'egreso';
        const saldo = this.formatearImporte(mov.saldoAcumulado);
        const reciboInfo = mov.recibo
          ? `(${mov.recibo.nroComprobante} - ${mov.recibo.cliente?.nombre || ''})`
          : '';

        // Formatear ingreso o egreso según el tipo
        const ingreso =
          mov.tipo === 'ingreso' ? this.formatearImporte(mov.importe) : '';
        const egreso =
          mov.tipo === 'egreso' ? this.formatearImporte(mov.importe) : '';

        return `
        <tr class="${tipoClass}">
          <td class="hora">${hora}</td>
          <td class="concepto">${mov.concepto} ${reciboInfo}</td>
          <td class="metodo">${mov.metodoPago?.nombre || '-'}</td>
          <td class="ingreso">${ingreso}</td>
          <td class="egreso">${egreso}</td>
          <td class="saldo">${saldo}</td>
        </tr>
      `;
      })
      .join('');

    return `<!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Caja Diaria</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Source Sans 3', sans-serif;
            background: white;
            color: #000;
            font-size: 11px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
          }
          .logo h1 {
            font-family: 'Playfair Display', serif;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 3px;
            margin-bottom: 0;
            line-height: 1.2;
          }
          .logo h2 {
            font-family: 'Playfair Display', serif;
            font-size: 24px;
            font-weight: 500;
            margin-top: 4px;
            letter-spacing: 2px;
          }
          .titulo {
            text-align: right;
          }
          .titulo h3 {
            font-family: 'Playfair Display', serif;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            letter-spacing: 2px;
          }
          .estado {
            display: inline-block;
            padding: 4px 12px;
            font-weight: 600;
            font-size: 10px;
            letter-spacing: 1px;
          }
          .abierta { background: #d1fae5; color: #065f46; }
          .cerrada { background: #fee2e2; color: #991b1b; }
          .info-caja {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
            padding: 12px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
          }
          .info-caja div {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .info-caja label {
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
          }
          .info-caja span {
            font-weight: 500;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          thead {
            background: #1f2937;
            color: white;
          }
          thead th {
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          thead th.hora { width: 10%; }
          thead th.concepto { width: 35%; }
          thead th.metodo { width: 15%; }
          thead th.ingreso { width: 12%; text-align: right; }
          thead th.egreso { width: 12%; text-align: right; }
          thead th.saldo { width: 16%; text-align: right; }
          tbody tr {
            border-bottom: 1px solid #e5e7eb;
          }
          tbody td {
            padding: 8px;
            font-size: 11px;
          }
          tbody tr.ingreso td.ingreso { color: #059669; font-weight: 500; text-align: right; }
          tbody tr.egreso td.egreso { color: #dc2626; font-weight: 500; text-align: right; }
          tbody td.ingreso { text-align: right; }
          tbody td.egreso { text-align: right; }
          tbody td.saldo {
            font-weight: 600;
            text-align: right;
            color: #2563eb;
          }
          .fila-total {
            background: #f3f4f6;
            font-weight: 600;
            border-top: 2px solid #000;
          }
          .fila-total td.total-label {
            padding: 10px 8px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #000;
          }
          .fila-total td.total-ingreso {
            padding: 10px 8px;
            font-size: 12px;
            text-align: right;
            color: #059669;
          }
          .fila-total td.total-egreso {
            padding: 10px 8px;
            font-size: 12px;
            text-align: right;
            color: #dc2626;
          }
          .fila-total td.total-saldo {
            padding: 10px 8px;
            font-size: 12px;
            text-align: right;
            color: #2563eb;
            font-weight: 700;
          }
          .resumen {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 20px;
          }
          .resumen-card {
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          .resumen-card.ingresos {
            border-color: #059669;
            background: #ecfdf5;
          }
          .resumen-card.egresos {
            border-color: #dc2626;
            background: #fef2f2;
          }
          .resumen-card.saldo {
            border-color: #2563eb;
            background: #eff6ff;
          }
          .resumen-label {
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .resumen-valor {
            font-family: 'Playfair Display', serif;
            font-size: 24px;
            font-weight: 600;
          }
          .resumen-valor.ingresos { color: #059669; }
          .resumen-valor.egresos { color: #dc2626; }
          .resumen-valor.saldo { color: #2563eb; }
          .firma {
            margin-top: 40px;
            text-align: right;
            padding-right: 30px;
          }
          .firma-line {
            border-top: 1px solid #000;
            padding-top: 8px;
            width: 250px;
          }
          .firma p {
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .no-movimientos {
            text-align: center;
            padding: 30px;
            color: #6b7280;
            font-style: italic;
          }
          .resumen-metodos {
            margin-top: 25px;
            margin-bottom: 20px;
            padding: 15px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          .resumen-metodos h4 {
            font-family: 'Playfair Display', serif;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #1f2937;
          }
          .resumen-metodos table {
            width: 100%;
            margin: 0;
          }
          .resumen-metodos thead th {
            background: #374151;
            color: white;
            font-size: 9px;
            font-weight: 600;
            padding: 8px 12px;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .resumen-metodos thead th.metodo-nombre { width: 35%; }
          .resumen-metodos thead th.metodo-ingresos { width: 25%; text-align: right; }
          .resumen-metodos thead th.metodo-egresos { width: 25%; text-align: right; }
          .resumen-metodos thead th.metodo-neto { width: 15%; text-align: right; }
          .resumen-metodos tbody td {
            padding: 8px 12px;
            font-size: 11px;
            border-bottom: 1px solid #e5e7eb;
          }
          .resumen-metodos tbody td.metodo-ingresos,
          .resumen-metodos tbody td.metodo-egresos,
          .resumen-metodos tbody td.metodo-neto {
            text-align: right;
            font-weight: 600;
          }
          .resumen-metodos tbody td.metodo-ingresos { color: #059669; }
          .resumen-metodos tbody td.metodo-egresos { color: #dc2626; }
          .resumen-metodos tbody td.metodo-neto.positivo { color: #2563eb; }
          .resumen-metodos tbody td.metodo-neto.negativo { color: #dc2626; }
          .resumen-metodos tbody tr:last-child td { border-bottom: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <h1>ESTUDIO</h1>
            <h1>CONTABLE</h1>
            <h2>ALBÓNICO</h2>
          </div>
          <div class="titulo">
            <h3>CAJA DIARIA</h3>
            <span class="estado ${estadoClass}">${estado}</span>
          </div>
        </div>

        <div class="info-caja">
          <div>
            <label>Fecha</label>
            <span>${fechaFormateada}</span>
          </div>
          <div>
            <label>Saldo Inicial</label>
            <span>${this.formatearImporte(caja.saldoInicial)}</span>
          </div>
          <div>
            <label>Fecha Cierre</label>
            <span>${fechaCierre}</span>
          </div>
        </div>

        ${
          movimientos.length > 0
            ? `
        <table>
          <thead>
            <tr>
              <th class="hora">Hora</th>
              <th class="concepto">Concepto</th>
              <th class="metodo">Método</th>
              <th class="ingreso">Ingreso</th>
              <th class="egreso">Egreso</th>
              <th class="saldo">Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${filasMovimientos}
            <tr class="fila-total">
              <td class="total-label" colspan="3">Total:</td>
              <td class="total-ingreso">${this.formatearImporte(totalIngresos)}</td>
              <td class="total-egreso">${this.formatearImporte(totalEgresos)}</td>
              <td class="total-saldo">${this.formatearImporte(saldoFinal)}</td>
            </tr>
          </tbody>
        </table>

        ${
          filasResumenMetodos
            ? `
        <div class="resumen-metodos">
          <h4>Resumen por Método de Pago</h4>
          <table>
            <thead>
              <tr>
                <th class="metodo-nombre">Método</th>
                <th class="metodo-ingresos">Ingresos</th>
                <th class="metodo-egresos">Egresos</th>
                <th class="metodo-neto">Neto</th>
              </tr>
            </thead>
            <tbody>
              ${filasResumenMetodos}
            </tbody>
          </table>
        </div>
        `
            : ''
        }
        `
            : '<div class="no-movimientos">No hay movimientos registrados en esta fecha</div>'
        }

        <div class="resumen">
          <div class="resumen-card ingresos">
            <div class="resumen-label">Ingresos Totales</div>
            <div class="resumen-valor ingresos">${this.formatearImporte(ingresos)}</div>
          </div>
          <div class="resumen-card egresos">
            <div class="resumen-label">Egresos Totales</div>
            <div class="resumen-valor egresos">${this.formatearImporte(egresos)}</div>
          </div>
          <div class="resumen-card saldo">
            <div class="resumen-label">Saldo Final</div>
            <div class="resumen-valor saldo">${this.formatearImporte(saldoFinal)}</div>
          </div>
        </div>

        <div class="firma">
          <div class="firma-line">
            <p>Firma y Sello</p>
          </div>
        </div>
      </body>
      </html>`;
  }

  private formatearFechaHora(fecha: Date | string): string {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    const hora = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
  }

  private formatearHora(fecha: Date | string): string {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const hora = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${hora}:${minutos}`;
  }
}
