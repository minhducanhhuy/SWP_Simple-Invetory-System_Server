import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      // Thay đổi logic lấy token tại đây:
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractJWT, // 1. Ưu tiên tìm trong Cookie
        ExtractJwt.fromAuthHeaderAsBearerToken(), // 2. Dự phòng tìm trong Header (nếu cần test Postman)
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
    });
  }

  private static extractJWT(req: Request): string | null {
    if (req.cookies && 'access_token' in req.cookies) {
      return req.cookies.access_token;
    }
    return null;
  }

  // 3. Logic validate mới: Query Database để lấy Role mới nhất
  async validate(payload: any) {
    // payload.sub chứa userId (đã quy định ở hàm login bên AuthService)
    const user = await this.usersService.findOne(payload.sub);

    // Nếu không tìm thấy user (đã bị xóa) hoặc bị khóa (nếu có cờ isActive)
    if (!user) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị khóa.',
      );
    }

    // (Optional) Kiểm tra thêm isActive nếu DB có trường này
    // if (!user.isActive) throw new UnauthorizedException('User is inactive');

    // Trả về object user mới nhất từ DB.
    // NestJS sẽ gắn object này vào `req.user`
    return {
      id: user.id,
      username: user.username,
      role: user.role, // <--- ĐÂY LÀ ROLE TƯƠI MỚI NHẤT TỪ DB
      // Các trường khác nếu cần
      fullName: user.fullName,
    };
  }
}
