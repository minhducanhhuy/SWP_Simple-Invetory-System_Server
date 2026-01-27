// location-roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LOCATION_ROLES_KEY } from './roles.decorator';
import { LocationRole, SystemRole } from '@prisma/client';

@Injectable()
export class LocationRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<LocationRole[]>(
      LOCATION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. Check quyền lực tối cao (OWNER hoặc ADMIN hệ thống thường được quyền làm tất cả mọi kho)
    // Nếu bạn muốn ADMIN cũng phải được add vào kho mới được làm thì bỏ dòng ADMIN đi.
    if (
      user.systemRole === SystemRole.OWNER ||
      user.systemRole === SystemRole.ADMIN
    ) {
      return true;
    }

    // 2. Lấy locationId từ Params
    // Lưu ý: Tên param trong controller phải đặt là 'locationId'
    const locationId = request.params.locationId;

    if (!locationId) {
      throw new ForbiddenException('Location ID is missing in request params');
    }

    // 3. Tìm xem User có quyền trong kho này không
    // Lưu ý: Lúc login (JWT Strategy), bạn phải query kèm bảng user_locations và nhét vào request.user
    const userLocation = user.locations.find(
      (loc) => loc.locationId === locationId,
    );

    if (!userLocation) {
      throw new ForbiddenException('You do not have access to this location');
    }

    // 4. Check Role cụ thể
    return requiredRoles.includes(userLocation.role);
  }
}
