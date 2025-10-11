import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeoModule } from './seo/seo.module';

@Module({
  imports: [SeoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
