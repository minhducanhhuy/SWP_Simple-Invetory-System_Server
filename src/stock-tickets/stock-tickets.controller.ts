import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { StockTicketsService } from './stock-tickets.service';
import { CreateStockTicketDto } from './dto/create-stock-ticket.dto';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { Role, TicketType, TicketStatus } from '@prisma/client';

@Controller('stock-tickets')
export class StockTicketsController {
  constructor(private readonly stockTicketsService: StockTicketsService) {}

  @Get('reasons')
  findAllReasons() {
    return this.stockTicketsService.getReasonCodes();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createStockTicketDto: CreateStockTicketDto, @Req() req) {
    const user = req.user;

    // 1. Phân quyền: Salesperson không được tạo phiếu IMPORT
    if (
      user.role === Role.SALESPERSON &&
      createStockTicketDto.type === TicketType.IMPORT
    ) {
      throw new ForbiddenException('Bạn không có quyền tạo phiếu Nhập kho');
    }

    // ==========================================================
    // 2. ÉP TRẠNG THÁI CHUẨN 100% THEO LOẠI NGHIỆP VỤ
    // ==========================================================

    // A. LUỒNG KIỂM KÊ (Dùng chuỗi cứng để chống lỗi undefined của Prisma)
    if (
      createStockTicketDto.reason === 'ADJUSTMENT' ||
      String(createStockTicketDto.type) === 'STOCKTAKE'
    ) {
      createStockTicketDto.status = 'PENDING_APPROVAL' as TicketStatus;
    }
    // B. LUỒNG CHUYỂN KHO
    else if (createStockTicketDto.reason === 'TRANSFER') {
      if (
        user.role === Role.WAREHOUSE_STAFF ||
        user.role === Role.SALESPERSON
      ) {
        throw new BadRequestException(
          'Thủ kho không có quyền tạo lệnh Điều chuyển!',
        );
      }
      createStockTicketDto.status =
        user.role === Role.OWNER
          ? ('IN_TRANSIT' as TicketStatus)
          : ('PENDING_APPROVAL' as TicketStatus);
    }
    // C. LUỒNG NHẬP / XUẤT BÌNH THƯỜNG
    else {
      // Nếu là Manager tạo phiếu Nhập Kho (IMPORT), đưa vào trạng thái chờ Sếp duyệt
      if (
        user.role === Role.MANAGER &&
        createStockTicketDto.type === 'IMPORT'
      ) {
        createStockTicketDto.status = 'PENDING_APPROVAL' as TicketStatus;
      } else {
        createStockTicketDto.status = 'COMPLETED' as TicketStatus;
      }
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
    if (user.role !== Role.MANAGER && user.role !== Role.OWNER) {
      throw new ForbiddenException('Bạn không có quyền duyệt phiếu');
    }
    // [SỬA Ở ĐÂY] - Truyền thêm user vào hàm approve
    return this.stockTicketsService.approve(id, user);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Param('id') id: string,
    @Req() req,
    @Body('reason') reason: string,
  ) {
    const user = req.user;
    if (user.role !== Role.MANAGER && user.role !== Role.OWNER) {
      throw new ForbiddenException('Bạn không có quyền từ chối phiếu');
    }
    return this.stockTicketsService.cancel(id, reason);
  }

  // [API MỚI] - Dành cho Kho đích bấm nhận hàng chuyển đến
  @Patch(':id/receive')
  @UseGuards(JwtAuthGuard)
  async receiveTransfer(
    @Param('id') id: string,
    @Body('actualDetails') actualDetails: any[],
    @Body('locationId') locationId: string, // Lấy ID kho mà Frontend gửi lên
    @Req() req,
  ) {
    const user = req.user;

    // CHẶN 1: Bắt buộc phải là Thủ kho mới được nhận hàng
    if (user.role !== Role.WAREHOUSE_STAFF) {
      throw new ForbiddenException(
        'Lỗi bảo mật: Chỉ Thủ kho trực tiếp tại chi nhánh mới được phép xác nhận hàng đến!',
      );
    }

    // Gửi thêm locationId xuống Service để check chéo
    return this.stockTicketsService.receiveTransfer(
      id,
      actualDetails || [],
      locationId,
    );
  }
}
