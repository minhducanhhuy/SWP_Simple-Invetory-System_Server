import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  // Hàm cũ (giữ nguyên nếu cần)
  async sendUserConfirmation(user: User, token: string) {
    const url = `example.com/auth/confirm?token=${token}`;
    await this.mailerService.sendMail({
      to: user.email || undefined,
      subject: 'Welcome to Nice App! Confirm your Email',
      template: './confirmation',
      context: {
        name: user.username,
        url,
      },
    });
  }

  // --- HÀM MỚI: Gửi thư mời ---
  async sendInvitation(email: string, token: string, role: string) {
    // Đây là link dẫn về trang Frontend để user nhập Username/Pass
    // Ví dụ: http://localhost:3000/set-password?token=...
    const url = `http://localhost:3000/auth/accept-invite?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Bạn nhận được lời mời tham gia hệ thống Quản lý Kho',
      // Bạn có thể tạo template mới tên 'invitation.hbs' hoặc dùng HTML trực tiếp như dưới đây cho nhanh
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Xin chào,</h2>
          <p>Bạn đã được quản trị viên mời tham gia hệ thống với vai trò: <b>${role}</b>.</p>
          <p>Vui lòng click vào nút bên dưới để thiết lập tài khoản và mật khẩu:</p>
          <a href="${url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Thiết lập tài khoản
          </a>
          <p>Link này sẽ hết hạn sau 48 giờ.</p>
        </div>
      `,
    });
  }
}
