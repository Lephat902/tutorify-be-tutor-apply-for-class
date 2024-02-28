import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TutorApplyForClass } from './tutor-apply-for-class.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorApplyForClassService } from './tutor-apply-for-class.service';
import { TutorApplyForClassController } from './tutor-apply-for-class.controller';
import { TutorApplyForClassRepository } from './tutor-apply-for-class.repository';
import { CqrsModule } from '@nestjs/cqrs';
import { SagaModule } from 'nestjs-saga';
import { ApproveApplicationSagaHandler } from './sagas/handlers';
import { BroadcastModule } from '@tutorify/shared';

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
    CqrsModule,
    SagaModule.register({
      sagas: [ApproveApplicationSagaHandler],
      imports: [AppModule],
    }),
    BroadcastModule,
  ],
  providers: [
    TutorApplyForClassService,
    TutorApplyForClassRepository,
  ],
  controllers: [TutorApplyForClassController],
  exports: [
    TutorApplyForClassService,
    TutorApplyForClassRepository,
  ]
})
export class AppModule { }
