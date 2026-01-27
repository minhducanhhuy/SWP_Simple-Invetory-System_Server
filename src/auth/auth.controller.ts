import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SystemRolesGuard } from './system-roles.guard';
import { RequireSystemRole } from './roles.decorator';
import { SystemRole } from '@prisma/client';
import { InviteUserDto } from 'src/users/dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { type Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() req: LoginDto,
    @Res({ passthrough: true }) response: Response, // Inject Response để set cookie
  ) {
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
    const loginData = await this.authService.login(user); // Hàm này trả về { access_token, user }

    // 2. Set Cookie (Phần quan trọng)
    response.cookie('access_token', loginData.access_token, {
      httpOnly: true, // Javascript client không đọc được (Chống XSS)
      secure: false, // Đặt là true nếu chạy https (Production)
      sameSite: 'lax', // Hoặc 'none' nếu frontend/backend khác domain
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // Hết hạn sau 1 ngày
    });

    // 3. Trả về thông tin user (nhưng KHÔNG trả access_token trong body nữa)
    return {
      message: 'Đăng nhập thành công',
      user: loginData.user,
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    // Xóa cookie khi logout
    response.clearCookie('access_token');
    return { message: 'Đăng xuất thành công' };
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard, SystemRolesGuard) // Phải đăng nhập & Có quyền hệ thống
  @RequireSystemRole(SystemRole.ADMIN, SystemRole.OWNER) // Chỉ Admin/Owner được mời
  async invite(@Body() dto: InviteUserDto) {
    return this.authService.inviteUser(dto);
  }

  // API 2: Public API (Không cần đăng nhập) để User tạo acc từ link
  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }
}
