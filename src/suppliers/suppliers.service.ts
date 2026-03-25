import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PrismaService } from 'prisma/prisma.service';
import { NotificationType, ReasonCode} from '@prisma/client';
import { NotificationsService } from 'src/notification/notification.service';

@Injectable()
export class SuppliersService {
constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService, // Tiêm service vào đây
  ) {}

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

        if (ticket.reason === ReasonCode.BUY) {
          currentDebt += ticketTotal; // Tăng nợ
        } else if (ticket.reason === ReasonCode.RETURN_TO_SUPP) {
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
    const supplier = await this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        initialDebt: createSupplierDto.initialDebt || 0,
      },
    });
    // thông báo cho quản lý khi có nhà cung cấp mới được thêm vào
    await this.notify(
      'Đối tác mới',
      `Nhà cung cấp "${supplier.name}" vừa được thêm vào hệ thống.`,
      NotificationType.SUCCESS,
    );

    return supplier;
  }

  // 2. Lấy danh sách (Có thể mở rộng thêm search/filter sau này)
  async findAll() {
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: true },
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
      where: { id, isActive: true },
      include: {
        tickets: {
          where: {
            reason: ReasonCode.BUY,
          },
          include: { 
           // Thay vì chỉ details: true, ta mở rộng nó ra để include product
            details: {
              include: {
                product: {
                  select: { name: true, sku: true } // Lấy name và sku từ bảng Product
                }
              }
            }, 
            creator: { select: { fullName: true } } 
          },
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
          isActive: true,
        },
      });
      if (exist)
        throw new BadRequestException(
          `Mã NCC '${updateSupplierDto.code}' đã tồn tại!`,
        );
    }
    const updated = await this.prisma.supplier.update({
      where: { id, isActive: true },
      data: updateSupplierDto,
    });

    await this.notify(
      'Cập nhật đối tác',
      `Thông tin của nhà cung cấp "${updated.name}" vừa được thay đổi.`,
      NotificationType.INFO,
    );


    return updated;
  }

  // 5. Xóa (Soft delete)
  async remove(id: string) {
    return await this.prisma.supplier.update({
      where: { id, isActive: true },
      data: { isActive: false },
    });
  }
  private async notify(title: string, message: string, type: NotificationType) {
    try {
      // Tìm tất cả user có quyền OWNER hoặc MANAGER
      const managers = await this.prisma.user.findMany({
        where: { role: { in: ['OWNER', 'MANAGER'] } },
        select: { id: true }
      });

      // Lặp qua từng người và gửi thông báo
      for (const manager of managers) {
        await this.notificationsService.create({
          userId: manager.id,
          title: title,
          message: message,
          type: type,
        });
      }
    } catch (error) {
      // Bắt lỗi nhẹ ở đây để nếu Socket/thông báo lỗi thì hệ thống chính vẫn không bị crash
      console.error('Lỗi khi gửi thông báo:', error);
    }
  }
}
