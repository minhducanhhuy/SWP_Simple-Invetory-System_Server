import { Controller, Get, Post, Body, Param, UseGuards, Req, ForbiddenException, Patch } from '@nestjs/common';
import { StockTicketsService } from './stock-tickets.service';
import { CreateStockTicketDto } from './dto/create-stock-ticket.dto';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { Role, TicketType } from '@prisma/client';

@Controller('stock-tickets')
export class StockTicketsController {
  constructor(private readonly stockTicketsService: StockTicketsService) { }

  // 1. API này cực kỳ quan trọng cho reason codes
  @Get('reasons')
  findAllReasons() {
    return this.stockTicketsService.getReasonCodes();
  }

  @Post()
  @UseGuards(JwtAuthGuard) // Bắt buộc đăng nhập
  async create(@Body() createStockTicketDto: CreateStockTicketDto, @Req() req) {
    const user = req.user;

    //    const user = {
    //    id: '65b18f1b-3629-48c8-810c-d7417b9dc054', 
    //    role: 'MANAGER' // test postman k token 
    //  };

    // Phân quyền: Salesperson không được tạo phiếu IMPORT
    if (user.role === Role.SALESPERSON && createStockTicketDto.type === TicketType.IMPORT) {
      throw new ForbiddenException('Bạn không có quyền tạo phiếu Nhập kho');
    }

    return this.stockTicketsService.create(createStockTicketDto, user.id);
  }

  @Get()
  findAll() {
    return this.stockTicketsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockTicketsService.findOne(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard)
  async approve(@Param('id') id: string, @Req() req) {
    const user = req.user;
    // Cho phép cả MANAGER và OWNER duyệt
    if (user.role !== Role.MANAGER && user.role !== Role.OWNER) {
      throw new ForbiddenException('Bạn không có quyền duyệt phiếu');
    }
    return this.stockTicketsService.approve(id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Req() req, @Body('reason') reason: string) {
    const user = req.user;
    if (user.role !== Role.MANAGER && user.role !== Role.OWNER) {
      throw new ForbiddenException('Bạn không có quyền từ chối phiếu');
    }
    return this.stockTicketsService.cancel(id, reason); // Truyền reason xuống service
  }
}