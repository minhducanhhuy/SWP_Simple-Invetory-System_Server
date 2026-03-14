import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Role } from '@prisma/client';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) { }

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
        where: { isActive: true },
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

  // Lấy danh sách tất cả các kho đang hoạt động (Không phân quyền)
  async findAllActive() {
    console.log('--- START CALLING findAllActive ---');

    // 1. In toàn bộ kho có trong DB (không cần điều kiện) để xem DB có bị rỗng không
    const allLocations = await this.prisma.location.findMany();
    console.log('1. TẤT CẢ KHO TRONG DB:', allLocations);

    // 2. In số kho thỏa mãn điều kiện isActive
    const activeLocations = await this.prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    console.log('2. CÁC KHO IS_ACTIVE = TRUE:', activeLocations);

    console.log('--- END CALLING findAllActive ---');

    return activeLocations;
  }

  // --- 3. CÁC HAM CRUD CƠ BẢN KHÁC ---
  async findOne(id: string) {
    return this.prisma.location.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateLocationDto: UpdateLocationDto) {
    return this.prisma.location.update({
      where: { id },
      data: updateLocationDto,
    });
  }

  // [MỚI] Hàm xóa kho
  async remove(id: string) {
    // 1. Kiểm tra xem kho có đang chứa hàng không
    const hasInventory = await this.prisma.inventoryItem.findFirst({
      where: {
        locationId: id,
        quantity: { gt: 0 }, // Số lượng > 0
      },
    });

    if (hasInventory) {
      throw new BadRequestException(
        'Không thể xóa kho đang còn hàng tồn! Vui lòng chuyển hết hàng hoặc điều chỉnh về 0 trước khi xóa.',
      );
    }

    // 2. Kiểm tra xem kho đã có lịch sử phiếu chưa (Source hoặc Dest)
    const hasTickets = await this.prisma.stockTicket.findFirst({
      where: {
        OR: [{ sourceLocationId: id }, { destLocationId: id }],
      },
    });

    // Nếu đã có lịch sử phiếu -> Chỉ cho phép "Ngưng hoạt động" (Soft Delete)
    if (hasTickets) {
      // Option A: Tự động chuyển sang Soft Delete
      /*
       return this.prisma.location.update({
         where: { id },
         data: { isActive: false },
       });
       */

      // Option B: Báo lỗi yêu cầu người dùng tự khóa thủ công (Chọn cách này an toàn hơn)
      throw new BadRequestException(
        'Kho này đã có phát sinh giao dịch nhập/xuất. Bạn chỉ có thể "Tạm khóa" (Sửa -> Trạng thái) thay vì xóa vĩnh viễn.',
      );
    }

    // 3. Nếu kho rỗng và chưa có lịch sử -> Xóa vĩnh viễn
    // Cần xóa các ràng buộc Inventory = 0 trước (nếu có)
    await this.prisma.inventoryItem.deleteMany({
      where: { locationId: id },
    });

    // Xóa phân quyền user tại kho này
    await this.prisma.userLocation.deleteMany({
      where: { locationId: id },
    });

    return this.prisma.location.delete({
      where: { id },
    });
  }
}
