// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // 1. Chỉ lưu vào DB, không bắn đi đâu cả
  async create(dto: any) {
    return await this.prisma.notification.create({
      data: dto,
    });
  }

  // 2. Lấy thông báo (Giữ nguyên như cũ)
async getNotifications(userId: string, limit: number = 10, cursor?: string, type?: string, isReadParam?: string) {
    // 1. Khởi tạo điều kiện mặc định là tìm theo userId
    const whereCondition: any = { userId };

    // 2. Thêm điều kiện Lọc theo Loại (Nếu có và không phải ALL)
    if (type && type !== 'ALL') {
      whereCondition.type = type;
    }

    // 3. Thêm điều kiện Lọc theo Trạng thái (Nếu có)
    if (isReadParam === 'READ') {
      whereCondition.isRead = true;
    } else if (isReadParam === 'UNREAD') {
      whereCondition.isRead = false;
    }

    // 4. Query Database
    const notifications = await this.prisma.notification.findMany({
      where: whereCondition,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | undefined = undefined;
    if (notifications.length > limit) {
      const nextItem = notifications.pop();
      nextCursor = nextItem?.id;
    }

    // Số lượng chưa đọc (Luôn đếm tổng số chưa đọc của user, không bị ảnh hưởng bởi filter)
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { data: notifications, nextCursor, unreadCount };
  }

  // 3. Đánh dấu đã đọc (Giữ nguyên)
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }
}