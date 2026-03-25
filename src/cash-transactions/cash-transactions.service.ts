import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CashTransactionsService {
  constructor(private prisma: PrismaService) { }

  // Quản lý tự tạo phiếu Chi (Tiền điện, nước, trả NCC) hoặc Thu (Nạp quỹ)
  async create(data: any, creatorId: string) {
    return this.prisma.cashTransaction.create({
      data: {
        code: `${data.type === 'IN' ? 'PT' : 'PC'}-${Date.now()}`, // PT: Phiếu Thu, PC: Phiếu Chi
        type: data.type,
        category: data.category,
        amount: data.amount,
        paymentMethod: data.paymentMethod || 'CASH',
        note: data.note,
        locationId: data.locationId,
        creatorId,
      },
    });
  }

  // Lấy lịch sử Sổ quỹ theo Chi nhánh
  async findAll(locationId: string) {
    return this.prisma.cashTransaction.findMany({
      where: { locationId },
      include: { creator: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}