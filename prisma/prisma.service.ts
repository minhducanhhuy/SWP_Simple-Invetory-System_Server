import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Hàm này chạy khi ứng dụng bật -> Kết nối DB
  async onModuleInit() {
    await this.$connect();
  }

  // Hàm này chạy khi ứng dụng tắt -> Ngắt kết nối DB sạch sẽ
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
