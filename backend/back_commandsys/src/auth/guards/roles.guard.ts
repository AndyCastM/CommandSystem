// src/auth/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const { user } = ctx.switchToHttp().getRequest();

    // Si no hay roles definidos
    if (!requiredRoles) {
      this.logger.debug(
        `Sin roles definidos para ${ctx.getHandler().name}. Acceso permitido por defecto.`
      );
      return true;
    }

    //  Si no existe user (JWT guard no ejecutado)
    if (!user) {
      this.logger.warn(
        `[RolesGuard] Usuario no autenticado o JwtAuthGuard no ejecutado antes de RolesGuard.`,
      );
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Log de contexto
    this.logger.debug(
      `Validando roles requeridos: [${requiredRoles.join(', ')}], rol del usuario: ${user.role}`
    );

    
    // Validación insensible a mayúsculas/minúsculas
    const match = requiredRoles.some(
      (r) => r.toLowerCase() === user.role?.toLowerCase()
    );

    if (!match) {
      this.logger.warn(
        `Acceso denegado. Handler: ${ctx.getHandler().name}, Requerido: [${requiredRoles.join(
          ', '
        )}], Usuario: ${user.role}`
      );
      throw new ForbiddenException(
        `Acceso denegado: requiere rol ${requiredRoles.join(' o ')}, tu rol es ${user.role}`
      );
    }

    this.logger.debug(`Acceso permitido a ${user.role} en ${ctx.getHandler().name}`);
    return true;
  }
}
