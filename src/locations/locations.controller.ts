import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) { }

  // Chỉ OWNER hoặc ADMIN mới được tạo kho
  @Post()
  @Roles(Role.OWNER)
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationsService.create(createLocationDto);
  }

  // Ai cũng được xem, nhưng Service sẽ lọc kết quả theo quyền
  @Get()
  findAll(@Request() req) {
    // req.user được lấy từ JwtAuthGuard (đã giải mã token)
    return this.locationsService.findAll(req.user);
  }
  // [THÊM MỚI] Route lấy tất cả kho (Dùng cho Dropdown chuyển kho)
  // Đặt TRƯỚC @Get(':id')
  @Get('all-active')
  findAllActive() {
    return this.locationsService.findAllActive();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  // Cả OWNER và ADMIN_SYSTEM đều được sửa thông tin và trạng thái kho
  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN_SYSTEM)
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationsService.update(id, updateLocationDto);
  }

  // Chỉ OWNER hoặc ADMIN mới được xóa kho
  @Delete(':id')
  @Roles(Role.OWNER) // Chỉ chủ hoặc admin mới được xóa
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }


}
