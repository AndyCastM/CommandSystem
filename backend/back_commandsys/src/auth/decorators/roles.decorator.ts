// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles'
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
// Usado en controladores para definir roles permitidos en rutas