import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
      // 1. Lưu phiếu vào bảng stock_tickets
      const ticket = await tx.stockTicket.create({
        data: {
          ...ticketData,
          code: `TK-${Date.now()}`,
          creatorId: creatorId,
          status: ticketData.status ?? TicketStatus.COMPLETED,
          details: {
            create: details.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              systemQty: item.systemQty,
              actualQty: item.actualQty,
              note: item.note,
            })),
          },
        },
      });

      // 2. [QUAN TRỌNG] CHỈ CỘNG/TRỪ KHO KHI TRẠNG THÁI LÀ COMPLETED
      // (Bỏ dấu // đi để nó chặn các phiếu PENDING_APPROVAL lại)
      if (ticket.status === TicketStatus.COMPLETED) {
        for (const item of details) {
          // --- A. XỬ LÝ TRỪ KHO (Nếu có sourceLocationId) ---
          if (dto.sourceLocationId) {
            const currentInv = await tx.inventoryItem.findUnique({
              where: {
                locationId_productId: {
                  locationId: dto.sourceLocationId,
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
                  locationId: dto.sourceLocationId,
                  productId: item.productId,
                },
              },
              data: { quantity: { decrement: item.quantity } },
            });
          }

          // --- B. XỬ LÝ CỘNG KHO (Nếu có destLocationId) ---
          if (dto.destLocationId) {
            await tx.inventoryItem.upsert({
              where: {
                locationId_productId: {
                  locationId: dto.destLocationId,
                  productId: item.productId,
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
      } // Kết thúc If chặn

      return ticket;
    });
  }

  async approve(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.stockTicket.findUnique({
        where: { id },
        include: { details: true },
      });

      if (!ticket) throw new NotFoundException('Phiếu không tồn tại');
      if (ticket.status !== TicketStatus.PENDING_APPROVAL) {
        throw new BadRequestException('Phiếu chỉ có thể duyệt khi ở trạng thái PENDING_APPROVAL');
      }

      for (const item of ticket.details) {
        // ==========================================
        // LOGIC 1: DÀNH RIÊNG CHO PHIẾU KIỂM KÊ
        // ==========================================
        if (ticket.type === 'STOCKTAKE') {
          // Tính chênh lệch: Thực tế - Hệ thống
          const diff = (item.actualQty ?? 0) - (item.systemQty ?? 0);

          if (diff !== 0) {
            // Lấy kho kiểm kê (lưu ở sourceLocationId)
            const locationId = ticket.sourceLocationId;
            // [THÊM ĐOẠN NÀY] Cam kết với TypeScript là có locationId
            if (!locationId) {
              throw new BadRequestException('Phiếu kiểm kê bị lỗi: Không xác định được kho kiểm kê!');
            }
            // Nếu đếm dư (diff > 0) -> Cộng thêm vào kho
            if (diff > 0) {
              await tx.inventoryItem.upsert({
                where: { locationId_productId: { locationId, productId: item.productId } },
                update: { quantity: { increment: diff } },
                create: { locationId, productId: item.productId, quantity: diff },
              });
            }
            // Nếu đếm thiếu (diff < 0) -> Trừ kho đi
            else if (diff < 0) {
              const absDiff = Math.abs(diff);
              await tx.inventoryItem.update({
                where: { locationId_productId: { locationId, productId: item.productId } },
                data: { quantity: { decrement: absDiff } },
              });
            }
          }
        }
        // ==========================================
        // LOGIC 2: DÀNH CHO IMPORT / EXPORT CŨ CỦA BẠN
        // ==========================================
        else {
          if (ticket.sourceLocationId) {
            await tx.inventoryItem.update({
              where: {
                locationId_productId: { locationId: ticket.sourceLocationId, productId: item.productId },
              },
              data: { quantity: { decrement: item.quantity } },
            });
          }
          if (ticket.destLocationId) {
            await tx.inventoryItem.upsert({
              where: {
                locationId_productId: { locationId: ticket.destLocationId, productId: item.productId },
              },
              update: { quantity: { increment: item.quantity } },
              create: { locationId: ticket.destLocationId, productId: item.productId, quantity: item.quantity },
            });
          }
        }
      }

      // Cập nhật trạng thái thành COMPLETED
      return tx.stockTicket.update({
        where: { id },
        data: { status: TicketStatus.COMPLETED },
      });
    });
  }

  async findAll() {
    return this.prisma.stockTicket.findMany({
      include: { details: true, creator: { select: { fullName: true } }, sourceLocation: { select: { name: true } }, destLocation: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.stockTicket.findUnique({
      where: { id },
      include: { details: { include: { product: true } }, sourceLocation: { select: { name: true } }, destLocation: { select: { name: true } }, creator: { select: { fullName: true } } },
    });
  }

  async cancel(id: string, reason?: string) {
    const ticket = await this.prisma.stockTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Phiếu không tồn tại');
    if (ticket.status !== TicketStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Chỉ có thể từ chối phiếu đang chờ duyệt');
    }

    // Ghi đè hoặc thêm lý do hủy vào cột note hiện tại
    const updatedNote = reason ? `[LÝ DO HỦY]: ${reason}` : ticket.note;

    return this.prisma.stockTicket.update({
      where: { id },
      data: {
        status: TicketStatus.CANCELLED,
        note: updatedNote
      },
    });
  }
}