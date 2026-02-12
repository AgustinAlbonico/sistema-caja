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
const bcrypt = __importStar(require("bcrypt"));
/**
 * Validación técnica: bcrypt funciona cuando NestJS se compila a JS y se ejecuta como bundle
 */
async function validateBcrypt() {
    try {
        console.log('🔄 Iniciando validación de bcrypt...');
        // Test 1: Generar hash
        const plainPassword = 'testpass123';
        const saltRounds = 10;
        console.log(`  ℹ️ Generando hash de contraseña (saltRounds: ${saltRounds})...`);
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        console.log(`  ✓ Hash generado: ${hashedPassword}`);
        // Test 2: Comparar contraseña correcta
        console.log(`  ℹ️ Comparando contraseña correcta...`);
        const isCorrect = await bcrypt.compare(plainPassword, hashedPassword);
        console.log(`  ✓ bcrypt.compare("${plainPassword}", hash) = ${isCorrect}`);
        if (!isCorrect) {
            throw new Error('bcrypt.compare devolvió false para contraseña correcta');
        }
        // Test 3: Comparar contraseña incorrecta
        console.log(`  ℹ️ Comparando contraseña incorrecta...`);
        const isWrong = await bcrypt.compare('wrongpass', hashedPassword);
        console.log(`  ✓ bcrypt.compare("wrongpass", hash) = ${isWrong}`);
        if (isWrong) {
            throw new Error('bcrypt.compare devolvió true para contraseña incorrecta');
        }
        console.log('✅ Validación de bcrypt EXITOSA - bcrypt funciona en bundle compilado\n');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error en validación de bcrypt:', error);
        process.exit(1);
    }
}
validateBcrypt();
//# sourceMappingURL=spike-bcrypt.js.map