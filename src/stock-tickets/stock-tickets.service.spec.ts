import { Test, TestingModule } from '@nestjs/testing';
import { StockTicketsService } from './stock-tickets.service';

describe('StockTicketsService', () => {
  let service: StockTicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockTicketsService],
    }).compile();

    service = module.get<StockTicketsService>(StockTicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
