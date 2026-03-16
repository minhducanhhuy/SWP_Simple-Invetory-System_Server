import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockTicketDto } from './dto/create-stock-ticket.dto';
import { TicketStatus, TicketType, ReasonCode } from '@prisma/client';

@Injectable()
export class StockTicketsService {
  constructor(private prisma: PrismaService) { }

  // Trả về danh sách lý do để hiện lên dropdown ở React
  getReasonCodes() {
    return Object.values(ReasonCode);
  }

  // src/stock-tickets/stock-tickets.service.ts

  async create(dto: CreateStockTicketDto, creatorId: string) {
    const { details, ...ticketData } = dto;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Lưu phiếu vào bảng stock_tickets (Phần này giữ nguyên của bạn)
      const ticket = await tx.stockTicket.create({
        data: {
          ...ticketData,
          code: `TK-${Date.now()}`,
          creatorId: creatorId,
          status: TicketStatus.COMPLETED,
          details: {
            create: details.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      // 2. [SỬA ĐOẠN NÀY] Logic cập nhật kho thông minh dựa trên việc tồn tại ID Kho
      for (const item of details) {

        // --- A. XỬ LÝ TRỪ KHO (Nếu có sourceLocationId) ---
        // Xảy ra khi: EXPORT (bán, hủy, trả NCC) VÀ TRANSFER (xuất đi)
        if (dto.sourceLocationId) {
          const currentInv = await tx.inventoryItem.findUnique({
            where: {
              locationId_productId: {
                locationId: dto.sourceLocationId,
                productId: item.productId
              },
            },
          });

          // Báo lỗi nếu trong kho không đủ hàng để trừ
          if (!currentInv || currentInv.quantity < item.quantity) {
            throw new BadRequestException(`Sản phẩm ${item.productId} không đủ tồn kho để xuất!`);
          }

          // Trừ số lượng
          await tx.inventoryItem.update({
            where: {
              locationId_productId: {
                locationId: dto.sourceLocationId,
                productId: item.productId
              },
            },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        // --- B. XỬ LÝ CỘNG KHO (Nếu có destLocationId) ---
        // Xảy ra khi: IMPORT (nhập mua, khách trả) VÀ TRANSFER (nhận về)
        if (dto.destLocationId) {
          await tx.inventoryItem.upsert({
            where: {
              locationId_productId: {
                locationId: dto.destLocationId,
                productId: item.productId
              },
            },
            update: { quantity: { increment: item.quantity } },
            create: {
              locationId: dto.destLocationId,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
        }
      }
      // [KẾT THÚC SỬA]

      return ticket;
    });
  }

  async findAll() {
    return this.prisma.stockTicket.findMany({
      include: { details: true, creator: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.stockTicket.findUnique({
      where: { id },
      include: { details: { include: { product: true } } },
    });
  }
}