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

      // ========================================================
      // 2. KIỂM TRA & TRỪ TỒN KHO CÙNG LÚC (Bịt lỗ hổng bán lố)
      // ========================================================
      for (const item of dto.details) {
        // Dùng updateMany để gài điều kiện: quantity trong DB phải >= quantity khách mua
        const updatedInv = await tx.inventoryItem.updateMany({
          where: {
            locationId: dto.locationId,
            productId: item.productId,
            quantity: { gte: item.quantity } // Chặn đứng tại đây nếu kho không đủ
          },
          data: { quantity: { decrement: item.quantity } },
        });

        // Nếu count === 0 nghĩa là lệnh update bị từ chối (do điều kiện gte ở trên bị sai)
        if (updatedInv.count === 0) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          throw new BadRequestException(`Sản phẩm "${prod?.name || item.productId}" không đủ tồn kho hoặc đã hết hàng!`);
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

      // (ĐÃ XÓA BƯỚC 5 CŨ Ở ĐÂY VÌ ĐÃ TRỪ KHO Ở BƯỚC 2 RỒI)

      // 6. TẠO PHIẾU THU SỔ QUỸ
      await tx.cashTransaction.create({
        data: {
          code: `PT-BAN-${Date.now()}`,
          type: CashFlowType.IN,
          category: CashFlowCategory.SALE,
          amount: finalAmount,
          paymentMethod: dto.paymentMethod,
          note: `Thu tiền bán hàng - HĐ: ${invoice.code}`,
          locationId: dto.locationId,
          creatorId,
          customerId: dto.customerId,
          invoiceId: invoice.id,
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

  // Lấy danh sách hóa đơn theo chi nhánh (kèm chi tiết sản phẩm)
  async findAll(locationId: string) {
    return this.prisma.invoice.findMany({
      where: locationId ? { locationId } : undefined,
      orderBy: { createdAt: 'desc' }, // Sắp xếp hóa đơn mới nhất lên đầu
      include: {
        creator: { select: { fullName: true } }, // Tên thu ngân
        customer: { select: { name: true } },    // Tên khách hàng
        location: { select: { name: true } },    // Tên chi nhánh
        details: {                               // Lấy chi tiết từng món hàng trong bill
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
    });
  }

  // API lấy dữ liệu Dashboard
  async getDashboardSummary(locationId: string) {
    // 1. Tính mốc thời gian
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 2. Doanh thu & Đơn hàng hôm nay
    const todayInvoices = await this.prisma.invoice.findMany({
      where: { locationId, createdAt: { gte: today } },
    });
    const todayRevenue = todayInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
    const todayOrders = todayInvoices.length;

    // 3. Biểu đồ doanh thu 7 ngày qua (Nhóm dữ liệu bằng JS)
    const recentInvoices = await this.prisma.invoice.findMany({
      where: { locationId, createdAt: { gte: sevenDaysAgo } },
    });

    const chartDataMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
      chartDataMap[dateStr] = 0; // Khởi tạo mốc 0 đồng cho mỗi ngày
    }
    recentInvoices.forEach(inv => {
      const dateStr = `${inv.createdAt.getDate()}/${inv.createdAt.getMonth() + 1}`;
      if (chartDataMap[dateStr] !== undefined) {
        chartDataMap[dateStr] += Number(inv.amountPaid);
      }
    });
    const chartData = Object.keys(chartDataMap).map(date => ({
      date,
      revenue: chartDataMap[date]
    }));

    // 4. Cảnh báo sắp hết hàng (Dưới 10 sản phẩm)
    const lowStockItems = await this.prisma.inventoryItem.findMany({
      where: {
        locationId,
        quantity: { lte: 10 } // Tồn kho <= 10 thì báo động
      },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { quantity: 'asc' },
      take: 10,
    });

    // 5. Top 5 sản phẩm bán chạy (Từ các hóa đơn)
    const recentDetails = await this.prisma.invoiceDetail.findMany({
      where: { invoice: { locationId } },
      include: { product: { select: { name: true } } },
    });

    const productSales = {};
    recentDetails.forEach(detail => {
      if (!productSales[detail.product.name]) {
        productSales[detail.product.name] = 0;
      }
      productSales[detail.product.name] += detail.quantity;
    });

    const topProducts = Object.keys(productSales)
      .map(name => ({ name, quantity: productSales[name] }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      todayRevenue,
      todayOrders,
      chartData,
      lowStockItems: lowStockItems.map(item => ({
        id: item.id,
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity
      })),
      topProducts,
    };
  }

}