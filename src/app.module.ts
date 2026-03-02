import { Global, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';

// 1. IMPORT THƯ VIỆN MAILER
import { MailerModule } from '@nestjs-modules/mailer';
import { StockTicketsModule } from './stock-tickets/stock-tickets.module';

@Global()
@Module({
  imports: [
    // Cấu hình biến môi trường Global (để dùng process.env ở dưới)
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    MailModule,
    // 2. CẤU HÌNH MAILER MODULE (Global)
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.MAIL_PORT) || 587,
        secure: false, // true nếu dùng port 465
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      },
      defaults: {
        from: '"Hệ thống Kho" <noreply@inventory.com>',
      },
      // Nếu bạn chưa dùng template .hbs thì có thể bỏ qua phần template này
      // hoặc giữ nguyên cũng không sao (miễn là đừng gọi template khi chưa setup folder)
    }),
    StockTicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
