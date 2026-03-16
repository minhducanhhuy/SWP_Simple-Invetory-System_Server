import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  Delete,
  Param, // Thêm cái này để báo lỗi rõ ràng
} from '@nestjs/common';
import { SupplierPaymentsService } from './supplier-payments.service';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';

@Controller('supplier-payments')
@UseGuards(JwtAuthGuard)
export class SupplierPaymentsController {
  constructor(private readonly paymentService: SupplierPaymentsService) {}

  @Post()
  @Roles(Role.ADMIN_SYSTEM, Role.MANAGER, Role.OWNER)
  create(@Body() dto: CreateSupplierPaymentDto, @Request() req) {
    // SỬA Ở ĐÂY: Kiểm tra cả userId và id để tránh lỗi undefined

    return this.paymentService.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Delete(':id')
  @Roles(Role.ADMIN_SYSTEM, Role.MANAGER) // Chỉ quản lý được xóa tiền
  remove(@Param('id') id: string) {
    return this.paymentService.remove(id);
  }
}
