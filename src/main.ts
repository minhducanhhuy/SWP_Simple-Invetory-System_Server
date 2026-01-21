import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  //   app.enableCors({
  //     origin: 'http://localhost:3000', // Cấu hình domain frontend của bạn
  //     credentials: true,
  //     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //     allowedHeaders: 'Content-Type, Accept, Authorization, X-CSRF-TOKEN',
  //   });

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
