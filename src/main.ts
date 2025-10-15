import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unrecognized properties
      forbidNonWhitelisted: true, // throws error on extra props
      transform: true, // auto-transform to DTO types
    }),
  );

  await app.listen(3000);
}
bootstrap();
