import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // <--- QUAN TRỌNG: Giúp dùng Prisma ở mọi nơi mà không cần import lại Module này
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Xuất ra để các module khác dùng được
})
export class PrismaModule {}
