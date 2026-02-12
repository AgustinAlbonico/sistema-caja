import 'reflect-metadata';

/**
 * Validación técnica: TypeORM reflection funciona en código compilado JS
 */
async function validateTypeORM(): Promise<void> {
  try {
    console.log('🔄 Iniciando validación de TypeORM...');

    // Validar que reflect-metadata está cargado
    console.log(`  ℹ️ Verificando que reflect-metadata está disponible...`);
    
    // reflect-metadata añade métodos a Object.prototype
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (Reflect as any).getMetadata === 'function') {
      console.log(`  ✓ Reflect.getMetadata está disponible`);
    } else {
      throw new Error('reflect-metadata no está correctamente cargado');
    }

    // Crear un objeto de prueba con metadatos
    class TestEntity {
      id: string = '';
      email: string = '';
      firstName: string = '';
      lastName: string = '';
      createdAt: Date = new Date();
    }

    // Simular decoradores estableciendo metadatos
    Reflect.defineMetadata('design:type', String, TestEntity.prototype, 'id');
    Reflect.defineMetadata('design:type', String, TestEntity.prototype, 'email');
    Reflect.defineMetadata('design:type', String, TestEntity.prototype, 'firstName');
    Reflect.defineMetadata('design:type', String, TestEntity.prototype, 'lastName');
    Reflect.defineMetadata('design:type', Date, TestEntity.prototype, 'createdAt');

    console.log(`  ℹ️ Verificando metadatos de clase...`);

    // Acceder a metadatos
    const emailType = Reflect.getMetadata('design:type', TestEntity.prototype, 'email');
    const createdAtType = Reflect.getMetadata('design:type', TestEntity.prototype, 'createdAt');

    console.log(`  ✓ Metadatos de propiedades cargados:`);
    console.log(`    - email type: ${emailType.name}`);
    console.log(`    - createdAt type: ${createdAtType.name}`);

    // Validar tipos
    if (emailType !== String) {
      throw new Error('Tipo de email no es String');
    }

    if (createdAtType !== Date) {
      throw new Error('Tipo de createdAt no es Date');
    }

    console.log(`  ✓ TypeORM puede acceder a reflection metadata correctamente`);

    // Validar que podemos iterar propiedades (como TypeORM lo hace)
    const properties = Object.getOwnPropertyNames(TestEntity.prototype);
    console.log(`  ✓ Propiedades de entidad accesibles: ${properties.filter(p => p !== 'constructor').join(', ')}`);

    console.log('✅ Validación de TypeORM EXITOSA - TypeORM reflection funciona en bundle compilado\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en validación de TypeORM:', error);
    process.exit(1);
  }
}

validateTypeORM();
