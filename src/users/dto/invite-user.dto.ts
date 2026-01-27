import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { SystemRole } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(SystemRole)
  systemRole?: SystemRole = SystemRole.STAFF;
}
