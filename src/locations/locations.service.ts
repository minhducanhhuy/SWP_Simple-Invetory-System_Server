import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Role } from '@prisma/client';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // --- 1. TẠO KHO MỚI (Tự động init inventory) ---
  async create(createLocationDto: CreateLocationDto) {
    // Check trùng mã kho
    const exist = await this.prisma.location.findUnique({
      where: { code: createLocationDto.code },
    });
    if (exist) throw new BadRequestException('Mã kho đã tồn tại!');

    // Transaction: Tạo Kho -> Tạo Inventory = 0 cho tất cả SP hiện có
    return await this.prisma.$transaction(async (tx) => {
      const location = await tx.location.create({
        data: createLocationDto,
      });

      // Lấy tất cả sản phẩm đang kinh doanh
      const products = await tx.product.findMany({ where: { isActive: true } });

      if (products.length > 0) {
        const inventoryData = products.map((p) => ({
          locationId: location.id,
          productId: p.id,
          quantity: 0, // Mặc định 0
        }));

        await tx.inventoryItem.createMany({
          data: inventoryData,
        });
      }

      return location;
    });
  }

  // --- 2. LẤY DANH SÁCH (Phân quyền dữ liệu) ---
  async findAll(user: any) {
    // Nếu là Sếp (OWNER, ADMIN) -> Xem hết
    if (user.role === Role.ADMIN_SYSTEM || user.role === Role.OWNER) {
      return this.prisma.location.findMany({
        orderBy: { name: 'asc' },
      });
    }

    // Nếu là Nhân viên -> Chỉ xem kho được gán
    return this.prisma.location.findMany({
      where: {
        isActive: true,
        assignedUsers: {
          some: {
            userId: user.id, // Lọc theo bảng UserLocation
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // --- 3. CÁC HAM CRUD CƠ BẢN KHÁC ---
  async findOne(id: string) {
    return this.prisma.location.findUnique({
      where: { id },
    });
  }

  // --- CẬP NHẬT THÔNG TIN VÀ TRẠNG THÁI KHO ---
  async update(id: string, updateLocationDto: UpdateLocationDto) {
    // Nếu có yêu cầu TẮT kho (Vô hiệu hóa)
    if (updateLocationDto.isActive === false) {
      // 1. Kiểm tra nhân viên
      const staffCount = await this.prisma.userLocation.count({
        where: { locationId: id },
      });
      if (staffCount > 0) {
        throw new BadRequestException(
          'Không thể vô hiệu hóa! Vui lòng gỡ tất cả nhân viên khỏi kho này trước.',
        );
      }

      // 2. Kiểm tra tồn kho
      const hasInventory = await this.prisma.inventoryItem.findFirst({
        where: { locationId: id, quantity: { gt: 0 } },
      });
      if (hasInventory) {
        throw new BadRequestException(
          'Không thể vô hiệu hóa! Kho vẫn còn hàng tồn. Vui lòng xuất hoặc điều chuyển hết hàng trước.',
        );
      }
    }

    // Nếu hợp lệ (hoặc chỉ sửa tên/địa chỉ, hoặc bật lại kho) -> Tiến hành cập nhật
    return this.prisma.location.update({
      where: { id },
      data: updateLocationDto,
    });
  }

  // ==================================================
  // XÓA KHO (HARD DELETE)
  // ==================================================
  async remove(id: string) {
    // 1. Kiểm tra xem kho có nhân viên nào không
    const staffCount = await this.prisma.userLocation.count({
      where: { locationId: id },
    });
    if (staffCount > 0) {
      throw new BadRequestException(
        'Không thể xóa! Kho này vẫn đang có nhân viên được gán. Vui lòng gỡ quyền nhân viên trước.',
      );
    }

    // 2. Kiểm tra xem kho có đang chứa hàng không (số lượng > 0)
    const hasInventory = await this.prisma.inventoryItem.findFirst({
      where: { locationId: id, quantity: { gt: 0 } },
    });
    if (hasInventory) {
      throw new BadRequestException(
        'Không thể xóa! Kho vẫn còn hàng tồn. Vui lòng điều chuyển hết hàng trước.',
      );
    }

    // 3. Kiểm tra xem kho đã có lịch sử giao dịch chưa
    const hasTickets = await this.prisma.stockTicket.findFirst({
      where: { OR: [{ sourceLocationId: id }, { destLocationId: id }] },
    });
    if (hasTickets) {
      throw new BadRequestException(
        'Kho này đã từng có giao dịch nhập/xuất nên không thể xóa vĩnh viễn. Vui lòng dùng tính năng "Vô hiệu hóa" (Khóa kho).',
      );
    }

    // 4. Hợp lệ -> Tiến hành xóa
    // Cần xóa các dòng inventory (số lượng = 0) của kho này trước để không dính khóa ngoại
    return await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.deleteMany({
        where: { locationId: id },
      });

      return tx.location.delete({
        where: { id },
      });
    });
  }
}
