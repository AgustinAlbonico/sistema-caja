import * as bcrypt from 'bcrypt';

/**
 * Validación técnica: bcrypt funciona cuando NestJS se compila a JS y se ejecuta como bundle
 */
async function validateBcrypt(): Promise<void> {
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
  } catch (error) {
    console.error('❌ Error en validación de bcrypt:', error);
    process.exit(1);
  }
}

validateBcrypt();
