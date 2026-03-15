import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';

describe('SupplierPaymentsController', () => {
  let controller: SupplierPaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierPaymentsController],
      providers: [SupplierPaymentsService],
    }).compile();

    controller = module.get<SupplierPaymentsController>(SupplierPaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
