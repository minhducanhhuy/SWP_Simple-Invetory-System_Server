import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockTicketDto } from './dto/create-stock-ticket.dto';
import { TicketStatus, TicketType, ReasonCode } from '@prisma/client';

@Injectable()
export class StockTicketsService {
  constructor(private prisma: PrismaService) {}

  // Trả về danh sách lý do để hiện lên dropdown ở React
  getReasonCodes() {
    return Object.values(ReasonCode);
  }

  async create(dto: CreateStockTicketDto, creatorId: string) {
    const { details, ...ticketData } = dto;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Lưu phiếu vào bảng stock_tickets
      const ticket = await tx.stockTicket.create({
        data: {
          ...ticketData,
          code: `TK-${Date.now()}`, // Tạo mã phiếu tự động
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

      // 2. Logic cập nhật kho của Duy
      for (const item of details) {
        if (dto.type === TicketType.IMPORT) {
          // Nếu là NHẬP -> Cộng kho destLocationId
          await tx.inventoryItem.upsert({
            where: {
              locationId_productId: {
                locationId: dto.destLocationId!,
                productId: item.productId,
              },
            },
            update: { quantity: { increment: item.quantity } },
            create: {
              locationId: dto.destLocationId!,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
        } else {
          // Nếu là XUẤT -> Trừ kho sourceLocationId
          const currentInv = await tx.inventoryItem.findUnique({
            where: {
              locationId_productId: {
                locationId: dto.sourceLocationId!,
                productId: item.productId,
              },
            },
          });

          if (!currentInv || currentInv.quantity < item.quantity) {
            throw new BadRequestException(`Sản phẩm ${item.productId} không đủ tồn kho để xuất!`);
          }

          await tx.inventoryItem.update({
            where: {
              locationId_productId: {
                locationId: dto.sourceLocationId!,
                productId: item.productId,
              },
            },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }
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