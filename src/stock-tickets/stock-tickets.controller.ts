import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StockTicketsService } from './stock-tickets.service';
import { CreateStockTicketDto } from './dto/create-stock-ticket.dto';
import { UpdateStockTicketDto } from './dto/update-stock-ticket.dto';

@Controller('stock-tickets')
export class StockTicketsController {
  constructor(private readonly stockTicketsService: StockTicketsService) {}

  @Post()
  create(@Body() createStockTicketDto: CreateStockTicketDto) {
    return this.stockTicketsService.create(createStockTicketDto);
  }

  @Get()
  findAll() {
    return this.stockTicketsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockTicketsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStockTicketDto: UpdateStockTicketDto) {
    return this.stockTicketsService.update(+id, updateStockTicketDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockTicketsService.remove(+id);
  }
}
