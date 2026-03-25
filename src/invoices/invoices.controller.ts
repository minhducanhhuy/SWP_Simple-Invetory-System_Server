import { Controller, Post, Body, Req, UseGuards, Get, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard) // Chỉ người đăng nhập mới được bán hàng
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) { }

  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req) {
    // Bất kỳ ai (Salesperson, Manager, Owner) đều có thể chốt đơn nếu đứng ở quầy
    return this.invoicesService.create(createInvoiceDto, req.user.id);
  }

  @Get()
  findAll(@Query('locationId') locationId: string) {
    return this.invoicesService.findAllByLocation(locationId);
  }
}