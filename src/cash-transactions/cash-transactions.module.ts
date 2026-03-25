import { Module } from '@nestjs/common';
import { CashTransactionsService } from './cash-transactions.service';
import { CashTransactionsController } from './cash-transactions.controller';

@Module({
  controllers: [CashTransactionsController],
  providers: [CashTransactionsService],
})
export class CashTransactionsModule {}
