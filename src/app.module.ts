import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { WebhookModule } from './webhook/webhook.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [WebhookModule, PrismaModule],
  providers: [AppService],
})
export class AppModule {}
