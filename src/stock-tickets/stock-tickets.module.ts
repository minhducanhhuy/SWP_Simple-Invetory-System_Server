import { Module } from '@nestjs/common';
import { StockTicketsService } from './stock-tickets.service';
import { StockTicketsController } from './stock-tickets.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // Thêm dòng này

@Module({
  imports: [PrismaModule], // Thêm dòng này để dùng được Prisma
  controllers: [StockTicketsController],
  providers: [StockTicketsService],
})
export class StockTicketsModule {}