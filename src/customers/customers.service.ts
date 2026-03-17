import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo mới
  async create(createCustomerDto: CreateCustomerDto) {
    // Check trùng mã code
    const existCode = await this.prisma.customer.findUnique({
      where: { code: createCustomerDto.code },
    });
    if (existCode) {
      throw new BadRequestException(
        `Mã khách hàng '${createCustomerDto.code}' đã tồn tại!`,
      );
    }

    // Check trùng số điện thoại (nếu có nhập)
    if (createCustomerDto.phone) {
      const existPhone = await this.prisma.customer.findUnique({
        where: { phone: createCustomerDto.phone },
      });
      if (existPhone) {
        throw new BadRequestException(
          `Số điện thoại '${createCustomerDto.phone}' đã được sử dụng!`,
        );
      }
    }

    return await this.prisma.customer.create({
      data: createCustomerDto,
    });
  }

  // 2. Lấy danh sách
  async findAll() {
    return await this.prisma.customer.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { tickets: true } }, // Đếm số giao dịch (phiếu bán/trả)
      },
    });
  }

  // 3. Lấy chi tiết
  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        tickets: { take: 5, orderBy: { createdAt: 'desc' } }, // Lấy 5 giao dịch gần nhất
      },
    });
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    return customer;
  }

  // 4. Cập nhật
  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    // Check trùng code nếu có sửa
    if (updateCustomerDto.code) {
      const exist = await this.prisma.customer.findFirst({
        where: {
          code: updateCustomerDto.code,
          id: { not: id },
        },
      });
      if (exist)
        throw new BadRequestException(
          `Mã '${updateCustomerDto.code}' đã tồn tại!`,
        );
    }

    // Check trùng phone nếu có sửa
    if (updateCustomerDto.phone) {
      const exist = await this.prisma.customer.findFirst({
        where: {
          phone: updateCustomerDto.phone,
          id: { not: id },
        },
      });
      if (exist)
        throw new BadRequestException(
          `SĐT '${updateCustomerDto.phone}' đã tồn tại!`,
        );
    }

    return await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  // 5. Xóa
  async remove(id: string) {
    // Ràng buộc: Không được xóa khách đã có giao dịch (StockTicket)
    const countTicket = await this.prisma.stockTicket.count({
      where: { customerId: id },
    });

    if (countTicket > 0) {
      throw new BadRequestException(
        'Không thể xóa khách hàng đã phát sinh giao dịch (mua/trả hàng).',
      );
    }

    return await this.prisma.customer.delete({
      where: { id },
    });
  }
}
