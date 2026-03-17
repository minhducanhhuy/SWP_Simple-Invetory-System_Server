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

  // Trong class MailService
  // --- MỚI: Gửi email quên mật khẩu ---
  async sendPasswordResetEmail(email: string, token: string, fullName: string) {
    const url = `http://localhost:3000/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Yêu cầu đặt lại mật khẩu - IMS Enterprise',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2>Xin chào ${fullName || 'bạn'},</h2>
          <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này.</p>
          <p>Vui lòng click vào nút bên dưới để thiết lập mật khẩu mới (Link này chỉ có hiệu lực trong <b>1 giờ</b>):</p>
          <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0;">Đặt lại mật khẩu</a>
          <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
        </div>
      `,
    });
  }
}
