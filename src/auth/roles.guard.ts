import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Lấy danh sách quyền yêu cầu từ Decorator @Roles
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu API không yêu cầu quyền gì đặc biệt => Cho qua
    if (!requiredRoles) {
      return true;
    }

    // 2. Lấy user từ request (đã được JwtAuthGuard gán vào trước đó)
    const { user } = context.switchToHttp().getRequest();

    // 3. Kiểm tra xem role của user có nằm trong danh sách cho phép không
    return requiredRoles.some((role) => user.role === role);
  }
}
