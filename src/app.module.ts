import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeoModule } from './seo/seo.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [SeoModule, ConfigModule.forRoot({ isGlobal: true }),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
