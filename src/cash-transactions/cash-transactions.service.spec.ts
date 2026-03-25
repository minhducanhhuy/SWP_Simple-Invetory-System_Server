import { Test, TestingModule } from '@nestjs/testing';
import { CashTransactionsService } from './cash-transactions.service';

describe('CashTransactionsService', () => {
  let service: CashTransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CashTransactionsService],
    }).compile();

    service = module.get<CashTransactionsService>(CashTransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
