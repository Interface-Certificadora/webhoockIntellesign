import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { join } from 'path';
import { Logs } from './models/log.model';


@Global()
@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'sqlite',
      storage: join(__dirname, '..', '..', 'db', 'database.sqlite'), // caminho do arquivo
      models: [Logs],
      autoLoadModels: true,
      synchronize: true, // cria as tabelas automaticamente (dev only)
      logging: false, // ou console.log para ver as queries SQL
    }),
    SequelizeModule.forFeature([Logs]),
  ],
  exports: [SequelizeModule, SequelizeModule.forFeature([Logs])],
})
export class SquelizeModule {}
