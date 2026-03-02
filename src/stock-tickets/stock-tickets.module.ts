import { Module } from '@nestjs/common';
import { StockTicketsService } from './stock-tickets.service';
import { StockTicketsController } from './stock-tickets.controller';

@Module({
  controllers: [StockTicketsController],
  providers: [StockTicketsService],
})
export class StockTicketsModule {}
