import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

// Import Enum từ Prisma Client (QUAN TRỌNG)
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { UsersService } from 'src/users/users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private usersService: UsersService,
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
    const { email, role } = dto;

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
        role: role || 'STAFF', // Mặc định là STAFF nếu không chọn
        expiresAt,
      },
    });

    // Gửi mail
    await this.mailService.sendInvitation(email, token, role || 'STAFF');

    return { message: 'Đã gửi lời mời thành công!' };
  }

  // --- 2. USER GỌI HÀM NÀY KHI CLICK LINK & SUBMIT FORM ---
  async acceptInvite(dto: AcceptInviteDto) {
    const { token, username, password, address, fullName, phone } = dto;

    // 1. Validate Token (Logic nghiệp vụ của Auth - Giữ nguyên)
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Lời mời không tồn tại hoặc đường dẫn sai.');
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.userInvitation.delete({ where: { token } });
      throw new BadRequestException(
        'Lời mời đã hết hạn. Vui lòng liên hệ Admin để nhận lại.',
      );
    }

    // 2. CHUYỂN GIAO TRÁCH NHIỆM TẠO USER CHO USERS SERVICE
    // Auth Service chỉ có nhiệm vụ tổng hợp dữ liệu chuẩn xác
    try {
      await this.usersService.create({
        username,
        password, // UsersService sẽ tự hash
        fullName,
        phone,
        address,
        email: invitation.email, // Quan trọng: Lấy email gốc từ lời mời để bảo mật
        role: invitation.role, // Quan trọng: Lấy role gốc từ lời mời
      });
    } catch (error) {
      // Handle lỗi từ UsersService ném ra (ví dụ trùng username)
      throw error;
    }

    // 3. Dọn dẹp (Logic của Auth - Giữ nguyên)
    await this.prisma.userInvitation.delete({ where: { token } });

    return {
      message: 'Tạo tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.',
    };
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role, // Trả về role cho FE
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

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          email,
          fullName,
          phone,
        },
      });

      // Xóa password trước khi trả về response
      const { password: _, ...result } = user;
      return { message: 'User registered successfully', user: result };
    } catch (error) {
      throw new InternalServerErrorException('Registration failed');
    }
  }

  // --- 1. Xử lý Yêu cầu quên mật khẩu ---
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.email || !user.fullName) {
      // Để bảo mật, không nên báo lỗi "Email không tồn tại". Cứ trả về thành công chung chung.
      return {
        message:
          'Nếu email tồn tại trong hệ thống, hướng dẫn khôi phục đã được gửi.',
      };
    }

    // Tạo token ngẫu nhiên
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Hết hạn sau 1 giờ

    // Lưu vào DB
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: expiresAt,
      },
    });

    // Gửi mail
    await this.mailService.sendPasswordResetEmail(
      user.email,
      token,
      user.fullName,
    );

    return {
      message: 'Hướng dẫn khôi phục mật khẩu đã được gửi tới email của bạn.',
    };
  }

  // --- 2. Xử lý Đặt lại mật khẩu (Khi có token) ---
  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword } = dto;

    // Tìm user có token này và token chưa hết hạn
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: {
          gt: new Date(), // Thời gian hết hạn phải lớn hơn hiện tại
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Mã khôi phục không hợp lệ hoặc đã hết hạn.',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật pass mới và xóa token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return {
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.',
    };
  }
}
