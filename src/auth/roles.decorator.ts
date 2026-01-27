// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { LocationRole, SystemRole } from '@prisma/client';

export const SYSTEM_ROLES_KEY = 'system_roles';
export const RequireSystemRole = (...roles: SystemRole[]) =>
  SetMetadata(SYSTEM_ROLES_KEY, roles);

export const LOCATION_ROLES_KEY = 'location_roles';
export const RequireLocationRole = (...roles: LocationRole[]) =>
  SetMetadata(LOCATION_ROLES_KEY, roles);
