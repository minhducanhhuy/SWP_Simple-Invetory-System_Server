import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { CashTransactionsService } from './cash-transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cash-transactions')
export class CashTransactionsController {
  constructor(private readonly cashTransactionsService: CashTransactionsService) { }

  @Post()
  create(@Body() createDto: any, @Req() req) {
    return this.cashTransactionsService.create(createDto, req.user.id);
  }

  @Get()
  findAll(@Query('locationId') locationId: string) {
    return this.cashTransactionsService.findAll(locationId);
  }
}