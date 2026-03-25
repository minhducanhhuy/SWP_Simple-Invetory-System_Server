// src/supplier-payments/supplier-payments.service.ts
import { Injectable } from '@nestjs/common';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class SupplierPaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierPaymentDto, creatorId: string) {
    // Chỉ tạo bản ghi Payment, không update Supplier
    return await this.prisma.supplierPayment.create({
      data: {
        code: `PAY_${Date.now()}`,
        supplierId: dto.supplierId,
        amount: dto.amount,
        note: dto.note,
        creatorId: creatorId,
        locationId: dto.locationId,
      },
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
