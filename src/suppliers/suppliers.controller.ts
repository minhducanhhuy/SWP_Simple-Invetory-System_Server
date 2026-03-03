import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Import Guard
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('suppliers')
@UseGuards(JwtAuthGuard) // Bắt buộc đăng nhập mới được gọi API này
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(Role.ADMIN_SYSTEM, Role.MANAGER) // Chỉ những role này được tạo
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get()
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // ID là string (UUID), không dùng +id
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN_SYSTEM, Role.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_SYSTEM) // Chỉ Admin được xóa
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
