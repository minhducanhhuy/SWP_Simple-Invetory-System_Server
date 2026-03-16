import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Sẽ tạo ở bước sau
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { read } from 'fs';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMyInfo(@Request() req) {
    console.log('User from Request:', req.user);
    return this.usersService.getMyInfo(req.user);
  }

  // [MỚI] API Lấy danh sách nhân viên
  // Chỉ ADMIN_SYSTEM hoặc MANAGER mới xem được danh sách
  @Roles(Role.ADMIN_SYSTEM, Role.MANAGER)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  //   @Roles(Role.ADMIN_SYSTEM)
  //   @Post()
  //   create(@Body() createUserDto: CreateUserDto) {
  //     return this.usersService.create(createUserDto);
  //   }

  // --- 1. USER TỰ CẬP NHẬT PROFILE (Tên, SĐT, Pass) ---
  @Patch('profile')
  updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    // req.user.id lấy từ token (đảm bảo chính chủ)
    return this.usersService.updateProfile(req.user.id, updateUserDto);
  }

  // --- 2. ADMIN CẬP NHẬT ROLE NGƯỜI KHÁC ---
  @Roles(Role.ADMIN_SYSTEM)
  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body('role') role: Role) {
    console.log(`Admin updating user ${id} to role ${role}`); // Log để debug
    return this.usersService.updateRole(id, role);
  }

  @Roles(Role.ADMIN_SYSTEM, Role.OWNER)
  @Patch(':id/locations')
  assignLocations(
    @Param('id') id: string,
    @Body('locationIds') locationIds: string[],
  ) {
    return this.usersService.assignLocations(id, locationIds);
  }

  // [MỚI] API Xóa nhân viên
  @Roles(Role.ADMIN_SYSTEM)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // --- 3. ADMIN CẬP NHẬT TRẠNG THÁI (ACTIVE/LOCKED) ---
  @Roles(Role.ADMIN_SYSTEM, Role.OWNER)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.usersService.updateStatus(id, isActive);
  }
}
