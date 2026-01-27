import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Lấy danh sách Role yêu cầu từ Decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu API không yêu cầu role nào -> Cho qua
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 2. Check Quyền lực tối cao (OWNER luôn được qua)
    if (user.role === Role.OWNER) {
      return true;
    }

    // 3. Check Role của User có nằm trong danh sách cho phép không
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      return false; // User không đủ cấp bậc
    }

    // 4. Check xem User có thuộc Kho này không (Nếu API có param locationId)
    // Lưu ý: Lúc login, bạn cần query relation `assignedLocations` vào user
    const locationId = request.params.locationId;

    if (locationId) {
      const hasAccessToLocation = user.assignedLocations.some(
        (loc) => loc.locationId === locationId,
      );

      if (!hasAccessToLocation) {
        throw new ForbiddenException(
          'Bạn không được phân công làm việc tại kho này',
        );
      }
    }

    return true;
  }
}
