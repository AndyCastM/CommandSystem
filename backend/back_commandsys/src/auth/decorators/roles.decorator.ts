// src/auth/decorators/roles.decorator.ts
// src/auth/decorators/roles.decorator.ts
import { SetMetadata, Logger } from '@nestjs/common';
import { Role } from '../enums/role.enum';

/**
 * Clave única global para asociar roles en los metadatos.
 * Importante: no cambiar ni duplicar este valor en otra ruta.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorador @Roles — asigna uno o más roles permitidos a un método o clase.
 * Ejemplo: @Roles(Role.Admin, Role.Gerente)
 */
export const Roles = (...roles: Role[]) => {
  if (!roles || roles.length === 0) {
    Logger.warn(
      '[Roles Decorator] Se llamó sin roles. El endpoint quedará accesible a todos los usuarios.',
      'Roles'
    );
  }

  Logger.debug(`[Roles Decorator] Registrando roles: ${roles.join(', ')}`, 'Roles');
  return SetMetadata(ROLES_KEY, roles);
};

// Usado en controladores para definir roles permitidos en rutas