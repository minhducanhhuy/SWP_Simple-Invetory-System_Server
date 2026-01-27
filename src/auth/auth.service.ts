import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
// Import Enum từ Prisma Client (QUAN TRỌNG)
import { SystemRole } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { InviteUserDto } from 'src/users/dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      // Loại bỏ password trước khi trả về
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // 1. ADMIN GỌI HÀM NÀY
  // --- 1. ADMIN GỌI HÀM NÀY ĐỂ MỜI ---
  async inviteUser(dto: InviteUserDto) {
    const { email, systemRole } = dto;

    // Check xem email đã có account chưa
    const existingUser = await this.prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      throw new ConflictException(
        'Email này đã được sử dụng cho một tài khoản khác.',
      );
    }

    // Check xem đã mời chưa (tránh spam)
    const existingInvite = await this.prisma.userInvitation.findUnique({
      where: { email },
    });
    if (existingInvite) {
      // Nếu đã mời rồi thì có thể gửi lại mail hoặc báo lỗi tùy logic bạn muốn
      throw new ConflictException(
        'Email này đang có một lời mời chờ kích hoạt.',
      );
    }

    // Tạo token ngẫu nhiên (không phải JWT, chỉ là chuỗi random để định danh link)
    const token = randomBytes(32).toString('hex');

    // Set hạn 48h
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Lưu vào DB bảng UserInvitation (cần đảm bảo đã tạo bảng này trong schema.prisma)
    await this.prisma.userInvitation.create({
      data: {
        email,
        token,
        systemRole: systemRole || 'STAFF', // Mặc định là STAFF nếu không chọn
        expiresAt,
      },
    });

    // Gửi mail
    await this.mailService.sendInvitation(email, token, systemRole || 'STAFF');

    return { message: 'Đã gửi lời mời thành công!' };
  }

  // --- 2. USER GỌI HÀM NÀY KHI CLICK LINK & SUBMIT FORM ---
  async acceptInvite(dto: AcceptInviteDto) {
    const { token, username, password, fullName, phone } = dto;

    // Tìm thông tin lời mời dựa trên token
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
    });

    // Validate token
    if (!invitation) {
      throw new NotFoundException('Lời mời không tồn tại hoặc đường dẫn sai.');
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.userInvitation.delete({ where: { token } }); // Xóa rác
      throw new BadRequestException(
        'Lời mời đã hết hạn. Vui lòng liên hệ Admin để nhận lại.',
      );
    }

    // Check username xem có bị trùng với ai không
    const usernameExist = await this.prisma.user.findUnique({
      where: { username },
    });
    if (usernameExist) {
      throw new ConflictException('Username này đã có người sử dụng.');
    }

    // Tạo user thật sự
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: invitation.email, // Lấy email từ lời mời (đảm bảo chính chủ)
        fullName,
        phone,
        systemRole: invitation.systemRole, // Role đã được admin set từ trước
        isActive: true,
      },
    });

    // Xóa lời mời sau khi hoàn tất
    await this.prisma.userInvitation.delete({ where: { token } });

    return {
      message: 'Tạo tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.',
    };
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.systemRole,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        systemRole: user.systemRole, // Trả về role cho FE
      },
    };
  }

  async register(createUserDto: CreateUserDto) {
    const { username, password, email, fullName, phone } = createUserDto; // Lấy các trường cụ thể

    // Check trùng username hoặc email
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Logic: Nếu là user đầu tiên thì set là OWNER, còn lại là STAFF
    const usersCount = await this.prisma.user.count();
    const assignedRole: SystemRole =
      usersCount === 0 ? SystemRole.OWNER : SystemRole.STAFF;

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          email,
          fullName,
          phone,
          // SỬA LỖI Ở ĐÂY: Dùng 'systemRole' thay vì 'role'
          systemRole: assignedRole,
        },
      });

      // Xóa password trước khi trả về response
      const { password: _, ...result } = user;
      return { message: 'User registered successfully', user: result };
    } catch (error) {
      throw new InternalServerErrorException('Registration failed');
    }
  }
}
