import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TutorApplyForClass } from './tutor-apply-for-class.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorApplyForClassService } from './tutor-apply-for-class.service';
import { TutorApplyForClassController } from './tutor-apply-for-class.controller';
import { TutorApplyForClassRepository } from './tutor-apply-for-class.repository';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CqrsModule } from '@nestjs/cqrs';
import { SagaModule } from 'nestjs-saga';
import { ApproveApplicationSagaHandler } from './sagas/handlers';
import { BroadcastModule, QueueNames } from '@tutorify/shared';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([TutorApplyForClass]),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        type: configService.get('DATABASE_TYPE'),
        url: configService.get('DATABASE_URI'),
        entities: [TutorApplyForClass],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    ClientsModule.registerAsync([
      {
        name: QueueNames.CLASS_AND_CATEGORY,
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URI')],
            queue: QueueNames.CLASS_AND_CATEGORY,
            queueOptions: {
              durable: false,
            },
          },
        }),
      },
    ]),
    CqrsModule,
    SagaModule.register({
      sagas: [ApproveApplicationSagaHandler],
    }),
    BroadcastModule,
  ],
  providers: [
    TutorApplyForClassService,
    TutorApplyForClassRepository,
  ],
  controllers: [TutorApplyForClassController],
  exports: [TutorApplyForClassService]
})
export class AppModule { }
