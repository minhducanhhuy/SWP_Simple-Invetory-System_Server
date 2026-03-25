import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaModule } from '../../prisma/prisma.module';
@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule { }
