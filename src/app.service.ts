import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateWebhookDto) {
    try {
      console.log(data);
    } catch (error) {}
  }

  async status(uuid: string) {
    try {
      console.log(uuid);
    } catch (error) {}
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
