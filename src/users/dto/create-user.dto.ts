import { Role } from '@prisma/client';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Mật khẩu phải có chữ hoa, chữ thường và ít nhất 1 số hoặc ký tự đặc biệt',
  })
  password: string;

  @IsString()
  @Matches(/^[0-9]{9,11}$/, {
    message: 'Số điện thoại chỉ được chứa chữ số (9–11 số)',
  })
  phone: string;

  // 2. Thêm trường systemRole (Optional)
  // Nếu gửi lên thì phải đúng là: "ADMIN", "STAFF" hoặc "OWNER"
  @IsOptional()
  @IsEnum(Role, {
    message:
      'Role hệ thống không hợp lệ (OWNER, ADMIN, MANAGER, WAREHOUSE_STAFF, SALESPERSON,STAFF, )',
  })
  role?: Role;
}
