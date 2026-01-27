// system-roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SYSTEM_ROLES_KEY } from './roles.decorator';
import { SystemRole } from '@prisma/client';

@Injectable()
export class SystemRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true; // Không yêu cầu role thì cho qua

    const { user } = context.switchToHttp().getRequest();

    // Nếu user là OWNER thì luôn luôn cho qua (Quyền lực tối cao)
    if (user.systemRole === SystemRole.OWNER) return true;

    return requiredRoles.includes(user.systemRole);
  }
}
