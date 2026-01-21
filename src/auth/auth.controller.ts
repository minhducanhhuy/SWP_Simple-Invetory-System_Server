import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() req: LoginDto) {
    // req.username, req.password
    const user = await this.authService.validateUser(
      req.username,
      req.password,
    );
    if (!user) {
      throw new UnauthorizedException(
        'Sai tài khoản, mật khẩu hoặc tài khoản bị khóa',
      );
    }
    return this.authService.login(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // Với JWT, logout thực chất là Client xóa token.
    // Server chỉ cần trả về thông báo thành công.
    return { message: 'Đăng xuất thành công' };
  }
}
