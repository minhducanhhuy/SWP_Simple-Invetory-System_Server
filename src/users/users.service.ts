import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMyInfo(user: any) {
    const foundUser = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    // 1. Kiểm tra nếu không tìm thấy user
    if (!foundUser) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // 2. Kiểm tra trạng thái hoạt động
    if (!foundUser.isActive) {
      // Quăng lỗi Forbidden với thông báo tiếng Việt
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
      );
    }

    const { password, ...result } = foundUser;
    return result;
  }

  // 1. Tạo User mới
  async create(createUserDto: CreateUserDto) {
    // 1. Kiểm tra trùng lặp (Logic cũ giữ nguyên)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username đã tồn tại');
    }

    // 2. Hash password (Logic cũ giữ nguyên)
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 3. Lưu vào DB
    // Lưu ý: role sẽ được lấy từ createUserDto (do Auth service truyền sang)
    const newUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        isActive: true, // Mặc định active khi tạo xong
      },
    });

    const { password, ...result } = newUser;
    return result;
  }

  // 2. Tìm user theo username (Dùng cho Login)
  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  // [MỚI] Lấy danh sách tất cả user (trừ password)
  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignedLocations: {
          include: {
            location: true, // Lấy chi tiết tên kho
          },
        },
      },
    });

    return users.map((user) => {
      const { password, ...result } = user;
      // Flat lại cấu trúc để FE dễ dùng: assignedLocations: [{id, name}, ...]
      const locations = user.assignedLocations.map((ul) => ({
        id: ul.location.id,
        name: ul.location.name,
      }));
      return { ...result, assignedLocations: locations };
    });
  }

  // [MỚI] Xóa user
  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  // 3. Tìm user theo ID
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // [MỚI] Hàm cho User tự sửa (Chỉ cho sửa Tên, SĐT, Pass)
  async updateProfile(id: string, dto: UpdateUserDto) {
    const dataToUpdate: any = {};

    // Chỉ lấy các trường cho phép
    if (dto.fullName) dataToUpdate.fullName = dto.fullName;
    if (dto.phone) dataToUpdate.phone = dto.phone;

    // Nếu có đổi pass thì hash
    if (dto.password) {
      dataToUpdate.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.address) dataToUpdate.address = dto.address;

    // Tuyệt đối KHÔNG update role, email, username ở đây
    const user = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    const { password, ...result } = user;
    return result;
  }

  // [MỚI] Hàm cho Admin sửa Role
  async updateRole(id: string, role: Role) {
    // role kiểu Role enum
    const user = await this.prisma.user.update({
      where: { id },
      data: { role }, // Chỉ update role
    });
    const { password, ...result } = user;
    return result;
  }

  // [MỚI] Hàm gán kho cho nhân viên
  async assignLocations(userId: string, locationIds: string[]) {
    // Dùng transaction để đảm bảo dữ liệu nhất quán
    return await this.prisma.$transaction(async (tx) => {
      // B1: Xóa tất cả quyền kho cũ của user này
      await tx.userLocation.deleteMany({
        where: { userId },
      });

      // B2: Tạo quyền kho mới (nếu có chọn)
      if (locationIds.length > 0) {
        await tx.userLocation.createMany({
          data: locationIds.map((locId) => ({
            userId,
            locationId: locId,
          })),
        });
      }

      // Trả về user mới nhất
      return tx.user.findUnique({
        where: { id: userId },
        include: { assignedLocations: { include: { location: true } } },
      });
    });
  }

  // [MỚI] Hàm cập nhật trạng thái hoạt động
  async updateStatus(id: string, isActive: boolean) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive }, // Cập nhật trạng thái true/false
    });
    const { password, ...result } = user;
    return result;
  }
}
