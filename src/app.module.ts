import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TutorApplyForClass } from './tutor-apply-for-class.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorApplyForClassService } from './tutor-apply-for-class.service';
import { Controllers } from './controllers';
import { TutorApplyForClassRepository } from './tutor-apply-for-class.repository';
import { BroadcastModule } from '@tutorify/shared';
import { ClassApplicationEventDispatcher } from './class-application.event-dispatcher';

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
