import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TutorApplyForClass } from './tutor-apply-for-class.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorApplyForClassService } from './tutor-apply-for-class.service';
import { Controllers } from './controllers';
import { TutorApplyForClassRepository } from './tutor-apply-for-class.repository';
import { BroadcastModule, QueueNames } from '@tutorify/shared';
import { ClassApplicationEventDispatcher } from './class-application.event-dispatcher';
import { ClientsModule, Transport } from '@nestjs/microservices';

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
    BroadcastModule,
  ],
  providers: [
    TutorApplyForClassService,
    TutorApplyForClassRepository,
    ClassApplicationEventDispatcher,
  ],
  controllers: Controllers,
})
export class AppModule { }
