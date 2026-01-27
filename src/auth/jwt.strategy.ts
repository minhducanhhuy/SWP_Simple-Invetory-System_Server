import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      inclue: {
        location: true,
      },
    };
  }
}
