import { Test, TestingModule } from '@nestjs/testing';
import { StockTicketsController } from './stock-tickets.controller';
import { StockTicketsService } from './stock-tickets.service';

describe('StockTicketsController', () => {
  let controller: StockTicketsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockTicketsController],
      providers: [StockTicketsService],
    }).compile();

    controller = module.get<StockTicketsController>(StockTicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
