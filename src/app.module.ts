import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { SquelizeModule } from './squelize/squelize.module';

@Module({
  imports: [
    PrismaModule,
    SquelizeModule
  ],
  providers: [AppService],
  controllers: [AppController],
})
export class AppModule {}
