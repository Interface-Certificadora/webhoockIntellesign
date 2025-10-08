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
      const uuid = data.uuid;
      console.log('🚀 ~ AppService ~ create ~ uuid:', uuid);
      const StatusWebHook = data.resource.status;
      console.log('🚀 ~ AppService ~ create ~ StatusWebHook:', StatusWebHook);

      const envelope = await this.prisma.intelesign.findFirst({
        where: { UUID: uuid },
      });
      console.log('🚀 ~ AppService ~ create ~ envelope.id:', envelope.id);
      if (StatusWebHook === 'completed') {
        await this.Status(uuid, StatusWebHook, envelope.id);
      }

      let statusViw: string;
      switch (StatusWebHook) {
        case 'draft':
          statusViw = 'Rascunho';
          break;
        case 'in-transit':
          statusViw = 'Enviado';
          break;
        case 'expired':
          statusViw = 'Expirado';
          break;
        case 'halted':
          statusViw = 'Falhou';
          break;
        case 'completed':
          statusViw = 'Finalizado';
          break;
        case 'cancelled':
          statusViw = 'Cancelado';
          break;
      }

      console.log('🚀 ~ AppService ~ create ~ statusViw:', statusViw);
      if (!envelope.id) {
        const log=await this.logsRepository.create({
          log: `Envelop ${uuid} não encontrado, dados do webhook: ${JSON.stringify(
            data,
            null,
            2,
          )}`,
        });
        console.log("🚀 ~ AppService ~ create ~ log:", log)
      }

      await this.prisma.intelesign.update({
        where: {
          id: envelope.id,
        },
        data: {
          status: StatusWebHook,
          status_view: statusViw,
        },
      });

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

  async Status(uuid: string, StatusWebHook: string, envelopeId: number) {
    try {
      const token = await this.refreshToken();
      const status = await this.GetStatus(uuid, token);

      // Atualiza status dos signatários
      for (const recipient of status.recipients) {
        const recipientData = this.extractRecipientData(recipient);
        console.log("🚀 ~ AppService ~ Status ~ recipientData:", recipientData)

        // Busca o signatário pelo UUID primeiro (mais eficiente)
        let signatario = await this.prisma.intelesignSignatario.findFirst({
          where: { UUID: recipientData.uuid, envelope_id: envelopeId },
        });
        // Se não encontrou pelo UUID, tenta buscar por CPF e email
        if (!signatario) {
          const testsignatario =
            await this.prisma.intelesignSignatario.findFirst({
              where: {
                cpf: recipientData.cpf,
                email: recipientData.email,
                envelope_id: envelopeId,
              },
            });

          if (testsignatario) {
            await this.prisma.intelesignSignatario.update({
              where: { id: testsignatario.id },
              data: {
                state: recipientData.state,
                filled_at: recipientData.assinado,
                ...(recipientData.uuid && { UUID: recipientData.uuid }),
              },
            });

            signatario = testsignatario;
          }
        }

        // Se encontrou o signatário, prepara a atualização
        if (signatario) {
          await this.prisma.intelesignSignatario.update({
            where: { id: signatario.id },
            data: {
              state: recipientData.state,
              filled_at: recipientData.assinado,
              ...(recipientData.uuid && { UUID: recipientData.uuid }),
            },
          });
        }
      }

      const StatusName =
        status.state === 'done'
          ? 'Concluído'
          : status.state === 'completed'
            ? 'Concluído'
            : 'Em andamento';

      await this.prisma.intelesign.update({
        where: { id: envelopeId },
        data: {
          status: status.state,
          status_view: StatusName,
        },
      });

      return 'ok';
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      await this.logsRepository.create({
        log: `Erro ao buscar status: ${JSON.stringify(error, null, 2)}`,
      });
      throw new Error(
        `Erro ao buscar status: ${error.message || 'Erro ao buscar status'}`,
      );
    }
  }

  /**
   * Extrai dados do destinatário da resposta da API
   */
  private extractRecipientData(recipient: any) {
    const data = {
      uuid: recipient.id || null,
      state: recipient.state || null,
      email: null as string | null,
      assinado: null as string | null,
      cpf: null as string | null,
    };

    for (const addressee of recipient.addressees || []) {
      if (addressee.via === 'email') {
        data.email = addressee.value;
        data.assinado = addressee.ran_action_at;
      }

      for (const identifier of addressee.identifiers || []) {
        if (identifier.code === 'CPF') {
          data.cpf = identifier.value.replace(/\D/g, '');
        }
      }
    }

    return data;
  }

  async GetStatus(uuid: string, token: string) {
    try {
      const url = `https://api.intellisign.com/v1/envelopes/${uuid}?extended=true`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const data = await response.blob();
        throw new Error(`Erro ao buscar status: ${data}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      throw new Error(`Erro ao buscar status: ${error.message}`);
    }
  }

  async refreshToken() {
    try {
      const data = await this.GetTokenData();
      console.log(
        '🚀 ~ IntelesignService ~ refreshToken ~ ativo:',
        this.isTimestampExpired(Number(data.expires_in)),
      );
      if (this.isTimestampExpired(Number(data.expires_in))) {
        return data.access_token;
      }
      const Client_Id = process.env.INTELLISING_CLIENTE_ID;
      const Client_Secret = process.env.INTELLISING_CLIENTE_SECRET;
      const response = await fetch('https://api.intellisign.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: Client_Id,
          client_secret: Client_Secret,
          scope: '*',
        }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = responseData.message;
        const code = responseData.code;
        throw new HttpException(message, code);
      }
      await this.prisma.app_token.update({
        where: {
          id: 1,
        },
        data: {
          access_token: responseData.access_token,
          expires_in: responseData.expires_in,
        },
      });
      return responseData.access_token;
    } catch (error) {
      const message = error.message;
      const code = error.code;
      throw new HttpException(message, code);
    }
  }

  async GetTokenData() {
    const response = await this.prisma.app_token.findUnique({
      where: {
        id: 1,
      },
    });
    return response;
  }

  isTimestampExpired(timestamp: number) {
    const now = Math.floor(Date.now() / 1000);
    return now > timestamp;
  }
}
