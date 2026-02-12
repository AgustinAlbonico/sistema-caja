"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer = __importStar(require("puppeteer"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Validación técnica: Puppeteer puede encontrar y usar Chromium embebido con executablePath
 */
async function validatePuppeteer() {
    let browser = null;
    try {
        console.log('🔄 Iniciando validación de Puppeteer...');
        // Determinar ruta de Chromium embebido
        // En este spike, usaremos el Chromium de puppeteer (sin especificar executablePath)
        // En producción, se usaría: executablePath: '/ruta/a/chrome.exe'
        const chromiumPath = path.join(__dirname, '../../chrome/chrome.exe');
        const useEmbedded = fs.existsSync(chromiumPath);
        console.log(`  ℹ️ Verificando Chromium embebido en: ${chromiumPath}`);
        console.log(`  ℹ️ ¿Chromium embebido disponible? ${useEmbedded ? 'SÍ' : 'NO (usaremos el de puppeteer)'}`);
        // Lanzar navegador con argumentos de sandbox deshabilitados (necesario en algunos entornos)
        console.log(`  ℹ️ Lanzando navegador con args: --no-sandbox, --disable-setuid-sandbox, --disable-dev-shm-usage...`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const launchOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
            ],
        };
        // Si existe Chromium embebido, usarlo
        if (useEmbedded) {
            console.log(`  ℹ️ Usando Chromium embebido desde: ${chromiumPath}`);
            launchOptions.executablePath = chromiumPath;
        }
        browser = await puppeteer.launch(launchOptions);
        console.log(`  ✓ Navegador lanzado exitosamente`);
        // Abrir nueva página
        const page = await browser.newPage();
        console.log(`  ✓ Página creada`);
        // Crear contenido HTML de prueba con Google Fonts
        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Validación Spike - PDF</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@400&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Source Sans 3', sans-serif;
              padding: 40px;
              background: white;
            }
            h1 {
              font-family: 'Playfair Display', serif;
              color: #333;
              margin-bottom: 20px;
            }
            p {
              color: #666;
              line-height: 1.6;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <h1>Validación Spike - Puppeteer</h1>
          <p>Este PDF fue generado exitosamente usando Puppeteer.</p>
          <p>Fecha: ${new Date().toLocaleString()}</p>
          <p>Status: ✓ Puppeteer funciona correctamente en bundle compilado</p>
        </body>
      </html>
    `;
        // Establecer contenido
        console.log(`  ℹ️ Estableciendo contenido HTML...`);
        await page.setContent(htmlContent);
        console.log(`  ✓ Contenido establecido`);
        // Generar PDF
        const pdfPath = path.join(__dirname, '../test.pdf');
        console.log(`  ℹ️ Generando PDF en: ${pdfPath}`);
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        });
        console.log(`  ✓ PDF generado exitosamente`);
        // Verificar que el archivo existe
        if (fs.existsSync(pdfPath)) {
            const stats = fs.statSync(pdfPath);
            console.log(`  ✓ Archivo PDF existe - tamaño: ${stats.size} bytes`);
        }
        else {
            throw new Error('PDF no fue creado');
        }
        // Limpiar
        await page.close();
        await browser.close();
        browser = null;
        console.log('✅ Validación de Puppeteer EXITOSA - Puppeteer funciona en bundle compilado\n');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error en validación de Puppeteer:', error);
        if (browser) {
            await browser.close();
        }
        process.exit(1);
    }
}
validatePuppeteer();
//# sourceMappingURL=spike-puppeteer.js.map