import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
// Kế thừa các field tạo user cơ bản (username, password...)

// DTO này dùng khi User bấm submit form tạo tài khoản từ link email
export class AcceptInviteDto extends CreateUserDto {
  @IsString()
  @IsNotEmpty()
  token: string; // Token lấy từ URL
}
