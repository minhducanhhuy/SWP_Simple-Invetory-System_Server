import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// --- Imports bảo mật ---
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard) // 1. Áp dụng Guard cấp Controller: Phải đăng nhập mới gọi được API
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // --- TẠO SẢN PHẨM ---
  // Yêu cầu: Phải là ADMIN hoặc MANAGER
  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.WAREHOUSE_STAFF) //Cho phép cả nhân viên tạo
  create(@Body() createProductDto: CreateProductDto) {
    // Truyền userId vào service để ghi log người tạo
    return this.productsService.create(createProductDto);
  }
  // --- LẤY DANH SÁCH ---
  // Yêu cầu: Chỉ cần đăng nhập (đã được bao bởi @UseGuards ở trên)
  // Nhân viên kho (WAREHOUSE_STAFF) hay Thu ngân (SALESPERSON) đều cần xem để bán/nhập hàng
  @Get()
findAll(
  @Query('search') search: string,
  @Query('categoryId') categoryId: string,
  @Query('minPrice') minPrice: string,
  @Query('maxPrice') maxPrice: string,
  @Query('sortPrice') sortPrice: 'asc' | 'desc',
  @Headers('x-location-id') locationId: string,
  @Request() req,
) {
  return this.productsService.findAll(
    { search, categoryId, locationId, minPrice, maxPrice, sortPrice },
    req.user?.role,
  );
}

  // --- LẤY CHI TIẾT 1 SP ---
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // --- CẬP NHẬT SẢN PHẨM ---
  // Yêu cầu: ADMIN hoặc MANAGER
  @Patch(':id')
  @Roles(Role.OWNER, Role.WAREHOUSE_STAFF)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  // --- XÓA SẢN PHẨM (Soft Delete) ---
  // Yêu cầu: Chỉ ADMIN mới được xóa để đảm bảo an toàn dữ liệu
  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // [MỚI] API Lấy thẻ kho (Lịch sử giao dịch)
  @Get(':id/history')
  getProductHistory(@Param('id') id: string) {
    return this.productsService.getProductHistory(id);
  }
}
