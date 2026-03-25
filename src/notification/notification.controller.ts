// src/notifications/notifications.controller.ts
import { 
  Controller, 
  Get, 
  Patch, 
  Param, 
  Query, 
  UseGuards, 
  Req 
} from '@nestjs/common';
import { NotificationsService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Giả sử bạn đang dùng JWT Guard

@Controller('notifications') // Đường dẫn gốc sẽ là /api/notifications
@UseGuards(JwtAuthGuard) // Bắt buộc phải đăng nhập mới được gọi API này
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // 1. API lấy danh sách thông báo (Hứng cái request bị lỗi 404 của bạn)
  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('type') type?: string,       // Thêm bộ lọc loại
    @Query('isRead') isRead?: string,   // Thêm bộ lọc trạng thái
  ) {
    const userId = req.user.id;
    const take = limit ? parseInt(limit, 10) : 10;
    
    return this.notificationsService.getNotifications(userId, take, cursor, type, isRead);
  }

  // 2. API đánh dấu 1 thông báo là đã đọc
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }
}