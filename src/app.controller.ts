import { Controller, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  create(@Body() createWebhookDto: CreateWebhookDto) {
    return this.appService.create(createWebhookDto);
  }
}
