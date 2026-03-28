// src/supplier-payments/supplier-payments.service.ts
import { Injectable } from '@nestjs/common';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class SupplierPaymentsService {
  constructor(private prisma: PrismaService) { }

  // async create(dto: CreateSupplierPaymentDto, creatorId: string) {
  //   // Chỉ tạo bản ghi Payment, không update Supplier
  //   return await this.prisma.supplierPayment.create({
  //     data: {
  //       code: `PAY_${Date.now()}`,
  //       supplierId: dto.supplierId,
  //       amount: dto.amount,
  //       note: dto.note,
  //       creatorId: creatorId,
  //       locationId: dto.locationId,
  //     },
  //   });
  // }

  async create(dto: CreateSupplierPaymentDto, creatorId: string) {
    // Sử dụng $transaction để đảm bảo: 1 là thành công cả hai, 2 là rollback toàn bộ
    return await this.prisma.$transaction(async (tx) => {

      // 1. Tạo phiếu chi trả NCC lưu vào bảng SupplierPayment
      const payment = await tx.supplierPayment.create({
        data: {
          code: `PAY_${Date.now()}`,
          supplierId: dto.supplierId,
          amount: dto.amount,
          note: dto.note,
          creatorId: creatorId,
          locationId: dto.locationId,
        },
      });

      // 2. TỰ ĐỘNG TẠO PHIẾU CHI SỔ QUỸ (Trừ tiền mặt tại chi nhánh)
      await tx.cashTransaction.create({
        data: {
          code: `PC-NCC-${Date.now()}`, // Tiền tố PC-NCC để dễ phân biệt
          type: 'OUT',                  // Tiền đi ra
          category: 'IMPORT_PAY',       // Danh mục: Trả tiền nhà cung cấp
          amount: dto.amount,
          paymentMethod: 'CASH',        // Mặc định là tiền mặt, hoặc bạn có thể bổ sung thẻ/chuyển khoản
          note: `[Hệ thống tự động] Trả tiền NCC - ${dto.note || ''}`,
          locationId: dto.locationId,
          creatorId: creatorId,
        },
      });

      return payment;
    });
  }
  async findAll() {
    return this.prisma.supplierPayment.findMany({
      include: {
        supplier: { select: { name: true, code: true } },
        creator: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  // Thêm method remove
  async remove(id: string) {
    // Chỉ đơn giản là xóa record, công nợ NCC sẽ tự động được tính lại ở lần get sau
    return await this.prisma.supplierPayment.delete({
      where: { id },
    });
  }
}
