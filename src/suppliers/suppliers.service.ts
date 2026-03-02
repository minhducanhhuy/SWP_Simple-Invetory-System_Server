import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PrismaService } from 'prisma/prisma.service';
import { TicketType } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // --- HÀM TÍNH TOÁN CÔNG NỢ (Dùng chung) ---
  private calculateDebt(supplier: any) {
    let currentDebt = Number(supplier.initialDebt || 0);

    // 1. Tính toán từ Phiếu Kho (Nhập/Trả)
    if (supplier.tickets) {
      supplier.tickets.forEach((ticket) => {
        // Tính tổng tiền của phiếu
        // Lưu ý: details có thể undefined nếu không include trong query, cần check
        const details = ticket.details || [];
        const ticketTotal = details.reduce(
          (sum, item) => sum + Number(item.quantity) * Number(item.price),
          0,
        );

        if (ticket.type === TicketType.IMPORT) {
          currentDebt += ticketTotal; // Tăng nợ
        } else if (ticket.type === TicketType.RETURN_TO_SUPP) {
          currentDebt -= ticketTotal; // Giảm nợ
        }
      });
    }

    // 2. Tính toán từ Phiếu Chi (Thanh toán)
    if (supplier.payments) {
      supplier.payments.forEach((payment) => {
        currentDebt -= Number(payment.amount); // Giảm nợ
      });
    }

    // Trả về object supplier kèm thuộc tính 'debt' đã tính
    return { ...supplier, debt: currentDebt };
  }

  // 1. Tạo mới
  async create(createSupplierDto: CreateSupplierDto) {
    // Check trùng mã code
    const exist = await this.prisma.supplier.findUnique({
      where: { code: createSupplierDto.code },
    });
    if (exist) {
      throw new BadRequestException(
        `Mã NCC '${createSupplierDto.code}' đã tồn tại!`,
      );
    }

    return await this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        initialDebt: createSupplierDto.initialDebt || 0,
      },
    });
  }

  // 2. Lấy danh sách (Có thể mở rộng thêm search/filter sau này)
  async findAll() {
    const suppliers = await this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { tickets: true } },
        // Cần include tickets (kèm details) và payments để tính toán
        tickets: {
          include: { details: true },
        },
        payments: true,
      },
    });

    // Map qua danh sách và tính nợ cho từng NCC
    return suppliers.map((s) => this.calculateDebt(s));
  }

  // 3. Lấy chi tiết (Sử dụng lại hàm calculateDebt)
  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        tickets: {
          where: {
            OR: [
              { type: TicketType.IMPORT },
              { type: TicketType.RETURN_TO_SUPP },
            ],
          },
          include: { details: true, creator: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { date: 'desc' },
          include: { creator: { select: { fullName: true } } },
        },
      },
    });

    if (!supplier) throw new NotFoundException('Không tìm thấy NCC');

    return this.calculateDebt(supplier);
  }

  // 4. Cập nhật
  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    // Nếu có sửa mã code, cần check trùng lại (trừ chính nó ra)
    if (updateSupplierDto.code) {
      const exist = await this.prisma.supplier.findFirst({
        where: {
          code: updateSupplierDto.code,
          id: { not: id },
        },
      });
      if (exist)
        throw new BadRequestException(
          `Mã NCC '${updateSupplierDto.code}' đã tồn tại!`,
        );
    }

    return await this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  // 5. Xóa
  async remove(id: string) {
    // Check xem NCC này đã có giao dịch (phiếu nhập/chi) chưa
    const countTicket = await this.prisma.stockTicket.count({
      where: { supplierId: id },
    });
    const countPayment = await this.prisma.supplierPayment.count({
      where: { supplierId: id },
    });

    if (countTicket > 0 || countPayment > 0) {
      throw new BadRequestException(
        'Không thể xóa NCC đã phát sinh giao dịch. Hãy chỉ sửa thông tin!',
      );
    }

    return await this.prisma.supplier.delete({
      where: { id },
    });
  }
}
