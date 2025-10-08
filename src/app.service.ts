import { HttpException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { Logs } from './squelize/models/log.model';
import { InjectModel } from '@nestjs/sequelize';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    @InjectModel(Logs)
    private logsRepository: typeof Logs,
  ) {}

  async create(data: CreateWebhookDto) {
    try {
      const uuid = data.resource.uuid;
      console.log('🚀 ~ AppService ~ create ~ uuid:', uuid);
      const StatusWebHook = data.resource.status;
      console.log('🚀 ~ AppService ~ create ~ StatusWebHook:', StatusWebHook);

      const envelope = await this.prisma.intelesign.findFirst({
        where: { UUID: { contains: uuid } },
      });
      console.log('🚀 ~ AppService ~ create ~ envelope.id:', envelope.id);
      if (envelope.id) {
        await fetch(
          `'https://apiv2.sisnato.com.br/intelesign/status/${envelope.id}`,
        );
      }

      if (!envelope.id) {
        const log = await this.logsRepository.create({
          log: `Envelop ${uuid} não encontrado, dados do webhook: ${JSON.stringify(
            data,
          )}`,
        });
        console.log('🚀 ~ AppService ~ create ~ log:', log);
      }

      return 'ok';
    } catch (error) {
      console.error('Erro ao criar envelope:', error);
      await this.logsRepository.create({
        log: `Erro ao criar envelope: ${JSON.stringify(error, null, 2)}`,
      });
      throw new Error(
        `Erro ao criar envelope: ${error.message || 'Erro ao criar envelope'}`,
      );
    }
  }
}
