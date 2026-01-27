// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    // Cấu hình MailerModule.forRoot ở đây hoặc ở AppModule đều được
    // Nhưng thường MailModule sẽ setup MailerModule
  ],
  providers: [MailService],
  exports: [MailService], // <--- BẮT BUỘC PHẢI CÓ DÒNG NÀY
})
export class MailModule {}
