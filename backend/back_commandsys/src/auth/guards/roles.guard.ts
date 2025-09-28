// src/auth/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
    ]);

    if (!requiredRoles) {
        return true; // Si no hay roles requeridos, permitir acceso
    }

    const { user } = ctx.switchToHttp().getRequest();
    
    if (!user) {
        throw new ForbiddenException('Usuario no autenticado');
    }

    // user.role viene del payload del JWT
    if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException('No tienes permiso para acceder a este recurso');
    }

    return true; // Permitir acceso si el rol es válido
  }
}
