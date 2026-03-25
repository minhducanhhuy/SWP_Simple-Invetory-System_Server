import { Test, TestingModule } from '@nestjs/testing';
import { CashTransactionsController } from './cash-transactions.controller';
import { CashTransactionsService } from './cash-transactions.service';

describe('CashTransactionsController', () => {
  let controller: CashTransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashTransactionsController],
      providers: [CashTransactionsService],
    }).compile();

    controller = module.get<CashTransactionsController>(CashTransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
