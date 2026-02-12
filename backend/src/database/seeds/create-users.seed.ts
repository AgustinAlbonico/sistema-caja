import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';

import { Usuario } from '../entities/usuario.entity';
import { Auditoria } from '../entities/auditoria.entity';

interface UsuarioSeed {
  nombreUsuario: string;
  contrasena: string;
  nombreCompleto: string;
  activo: boolean;
}

const usuariosSeed: UsuarioSeed[] = [
  {
    nombreUsuario: 'admin',
    contrasena: 'ferchu123',
    nombreCompleto: 'Administrador del Sistema',
    activo: true,
  },
  {
    nombreUsuario: 'sandra',
    contrasena: 'Sandra123',
    nombreCompleto: 'Sandra (Cajero)',
    activo: true,
  },
  {
    nombreUsuario: 'fiore',
    contrasena: 'Fiore123',
    nombreCompleto: 'Fiore (Cajero)',
    activo: true,
  },
];

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'db_sistema_recibos',
    entities: [Usuario, Auditoria],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Conexión a base de datos establecida');

  const usuariosRepository = dataSource.getRepository(Usuario);

  // Crear o actualizar cada usuario
  for (const userData of usuariosSeed) {
    const existingUser = await usuariosRepository.findOne({
      where: { nombreUsuario: userData.nombreUsuario },
    });

    if (existingUser) {
      // Actualizar contraseña si el usuario ya existe
      existingUser.contrasenaHash = await bcrypt.hash(userData.contrasena, 10);
      existingUser.nombreCompleto = userData.nombreCompleto;
      existingUser.activo = userData.activo;
      await usuariosRepository.save(existingUser);
      console.log(`Usuario '${userData.nombreUsuario}' actualizado`);
    } else {
      // Crear nuevo usuario
      const contrasenaHash = await bcrypt.hash(userData.contrasena, 10);
      const nuevoUsuario = usuariosRepository.create({
        nombreUsuario: userData.nombreUsuario,
        contrasenaHash,
        nombreCompleto: userData.nombreCompleto,
        activo: userData.activo,
      });
      await usuariosRepository.save(nuevoUsuario);
      console.log(`Usuario '${userData.nombreUsuario}' creado exitosamente`);
    }
  }

  console.log('\n=== USUARIOS DISPONIBLES ===');
  for (const user of usuariosSeed) {
    console.log(`Usuario: ${user.nombreUsuario}`);
    console.log(`Contraseña: ${user.contrasena}`);
    console.log('---');
  }

  await dataSource.destroy();
  console.log('Conexión a base de datos cerrada');
}

seed().catch((error) => {
  console.error('Error ejecutando seed:', error);
  process.exit(1);
});
