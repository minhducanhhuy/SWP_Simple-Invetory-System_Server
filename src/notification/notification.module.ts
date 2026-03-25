import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // 1. Import JwtModule ở đây
import { NotificationsService } from './notification.service';
import { PrismaModule } from 'prisma/prisma.module'; // Giả sử bạn có import Prisma
import { NotificationsController } from './notification.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule, // 2. Đăng ký nó vào mảng imports
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // Export để StockTicketsModule dùng ké
})
export class NotificationsModule {}