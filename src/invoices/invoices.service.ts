import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { TicketType, ReasonCode, TicketStatus, CashFlowType, CashFlowCategory } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateInvoiceDto, creatorId: string) {
    if (!dto.details || dto.details.length === 0) {
      throw new BadRequestException('Hóa đơn không có sản phẩm nào!');
    }

    // 1. Tính toán tổng tiền ở Backend (Chống hack giá từ Frontend)
    let totalAmount = 0;
    for (const item of dto.details) {
      totalAmount += item.quantity * item.unitPrice;
    }
    const finalAmount = totalAmount - (dto.discount || 0);

    return await this.prisma.$transaction(async (tx) => {
      // 2. CHECK TỒN KHO TRƯỚC KHI BÁN
      for (const item of dto.details) {
        const currentInv = await tx.inventoryItem.findUnique({
          where: { locationId_productId: { locationId: dto.locationId, productId: item.productId } },
        });

        if (!currentInv || currentInv.quantity < item.quantity) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          throw new BadRequestException(`Sản phẩm "${prod?.name || item.productId}" không đủ tồn kho để bán! (Còn lại: ${currentInv?.quantity || 0})`);
        }
      }

      // 3. TẠO HÓA ĐƠN (Ghi nhận doanh thu)
      const invoice = await tx.invoice.create({
        data: {
          code: `HD-${Date.now()}`,
          creatorId,
          locationId: dto.locationId,
          customerId: dto.customerId,
          totalAmount,
          discount: dto.discount || 0,
          finalAmount,
          amountPaid: dto.amountPaid,
          paymentMethod: dto.paymentMethod,
          details: {
            create: dto.details.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subTotal: item.quantity * item.unitPrice,
            })),
          },
        },
      });

      // 4. TẠO PHIẾU XUẤT KHO TỰ ĐỘNG (Bóng ma)
      await tx.stockTicket.create({
        data: {
          code: `PX-BAN-${Date.now()}`,
          type: TicketType.EXPORT,
          reason: ReasonCode.SELL, // Lý do: Bán hàng
          status: TicketStatus.COMPLETED, // Bán xong là hoàn thành luôn
          creatorId,
          sourceLocationId: dto.locationId,
          customerId: dto.customerId,
          note: `Xuất kho tự động cho hóa đơn ${invoice.code}`,
          details: {
            create: dto.details.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.unitPrice,
            })),
          },
        },
      });

      // 5. TRỪ TỒN KHO THỰC TẾ
      for (const item of dto.details) {
        await tx.inventoryItem.update({
          where: { locationId_productId: { locationId: dto.locationId, productId: item.productId } },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      await tx.cashTransaction.create({
        data: {
          code: `PT-BAN-${Date.now()}`,
          type: CashFlowType.IN, // Chiều dòng tiền: THU VÀO
          category: CashFlowCategory.SALE, // Loại: BÁN HÀNG
          amount: finalAmount, // Chỉ ghi nhận số tiền thực tế cửa hàng đút túi (sau khi đã thối lại tiền thừa)
          paymentMethod: dto.paymentMethod,
          note: `Thu tiền bán hàng - HĐ: ${invoice.code}`,
          locationId: dto.locationId,
          creatorId,
          customerId: dto.customerId,
          invoiceId: invoice.id, // Móc nối trực tiếp vào Hóa đơn để sau này click vào là xem được chi tiết
        },
      });

      return invoice;
    });
  }


  // Lấy danh sách hóa đơn theo chi nhánh (Dùng cho Giao ca)
  async findAllByLocation(locationId: string) {
    return this.prisma.invoice.findMany({
      where: { locationId },
      include: { creator: { select: { fullName: true } }, customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}