import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo User mới
  async create(createUserDto: CreateUserDto) {
    // Kiểm tra trùng lặp
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email hoặc Username đã tồn tại');
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Lưu vào DB
    const newUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    // Loại bỏ password trước khi trả về (bảo mật)
    const { password, ...result } = newUser;
    return result;
  }

  // 2. Tìm user theo username (Dùng cho Login)
  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
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

  // 4. Cập nhật thông tin
  async update(id: string, updateUserDto: UpdateUserDto) {
    // Nếu có đổi mật khẩu thì phải hash lại
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    const { password, ...result } = updatedUser;
    return result;
  }
}
