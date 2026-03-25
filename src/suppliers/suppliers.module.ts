import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { NotificationsModule } from '../notification/notification.module';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService],
  imports: [NotificationsModule],
})
export class SuppliersModule {}
